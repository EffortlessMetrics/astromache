import assert from "node:assert/strict";
import { createServer } from "node:http";
import { readFile } from "node:fs/promises";
import { join, extname } from "node:path";
import { chromium } from "@playwright/test";

export async function verifyPackedPortfolioBrowser(directory) {
  const server = createServer(async (request, response) => {
    try {
      const path = decodeURIComponent(new URL(request.url, "http://localhost").pathname);
      if (request.method !== "GET" || path.split("/").includes("..")) {
        response.writeHead(400);
        response.end();
        return;
      }
      const file = join(directory, "dist", path.endsWith("/") ? `${path}index.html` : path);
      response.setHeader(
        "Content-Type",
        {
          ".html": "text/html",
          ".svg": "image/svg+xml",
          ".woff2": "font/woff2",
          ".css": "text/css",
          ".js": "text/javascript",
        }[extname(file)] ?? "application/octet-stream",
      );
      response.end(await readFile(file));
    } catch {
      response.writeHead(404);
      response.end();
    }
  });
  await new Promise((resolve) => server.listen(0, "127.0.0.1", resolve));
  const origin = `http://127.0.0.1:${server.address().port}`;
  const browser = await chromium.launch();
  try {
    for (const [width, height, theme] of [
      [320, 720, "dark"],
      [1440, 1000, "light"],
    ]) {
      const context = await browser.newContext({ viewport: { width, height }, colorScheme: theme });
      await context.route("**/*", (route) =>
        new URL(route.request().url()).origin === origin ? route.continue() : route.abort(),
      );
      const page = await context.newPage();
      await page.goto(`${origin}/portfolio/`);
      await page.evaluate(() => document.fonts.ready);
      const trigger = page.getByRole("button", {
        name: "Open Neutral landscape placeholder in the portfolio lightbox",
      });
      await trigger.focus();
      await page.keyboard.press("Enter");
      const dialog = page.getByRole("dialog", {
        name: "Neutral landscape placeholder",
        exact: true,
      });
      await dialog.waitFor({ state: "visible" });
      await page.waitForFunction(() => {
        const image = document.querySelector("#portfolio-lightbox-image");
        return image.complete && image.naturalWidth > 0;
      });
      assert.equal(await dialog.locator("img").getAttribute("src"), "/portfolio-placeholder.svg");
      assert.equal(
        await dialog
          .getByRole("button", { name: "Close", exact: true })
          .evaluate((element) => element === document.activeElement),
        true,
      );
      await page.keyboard.press("Escape");
      await dialog.waitFor({ state: "hidden" });
      assert.equal(await trigger.evaluate((element) => element === document.activeElement), true);
      assert.equal(
        await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth),
        true,
      );
      await context.close();
    }
    console.log(
      "Independent packed neutral portfolio: Enter/Escape, native focus return, image and narrow/wide theme checks passed",
    );
  } finally {
    await browser.close();
    await new Promise((resolve) => server.close(resolve));
  }
}
