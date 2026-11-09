import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { createServer } from "node:http";
import { extname, resolve, sep } from "node:path";
import { after, before, test } from "node:test";
import { fileURLToPath } from "node:url";
import { chromium, expect } from "@playwright/test";

// Exercise the built starter, including its exact installed Header and real
// browser default actions. No DOM shim can establish Tab or native Escape.
const dist = resolve(
  process.env.ASTROMACHE_SEARCH_KEYBOARD_DIST ||
    fileURLToPath(new URL("../dist/", import.meta.url)),
);
const index = JSON.parse(await readFile(resolve(dist, "search-index.json"), "utf8"));
assert.ok(index.data.length > 0, "Keyboard navigation requires a nonempty search corpus");
let browser, server, origin;

before(async () => {
  server = createServer(async (request, response) => {
    try {
      const pathname = new URL(request.url, "http://localhost").pathname;
      const file = resolve(
        dist,
        "." + decodeURIComponent(pathname) + (pathname.endsWith("/") ? "index.html" : ""),
      );
      if (request.method !== "GET" || !file.startsWith(dist + sep)) throw new Error("Bad path");
      response.setHeader(
        "Content-Type",
        {
          ".html": "text/html",
          ".js": "text/javascript",
          ".css": "text/css",
          ".json": "application/json",
        }[extname(file)] ?? "application/octet-stream",
      );
      response.end(await readFile(file));
    } catch {
      response.writeHead(404).end();
    }
  });
  await new Promise((done) => server.listen(0, "127.0.0.1", done));
  origin = `http://127.0.0.1:${server.address().port}`;
  browser = await chromium.launch();
  console.log(JSON.stringify({ node: process.version, chromium: browser.version(), dist }));
});

after(async () => {
  try {
    await browser?.close();
  } finally {
    if (server?.listening) await new Promise((done) => server.close(done));
  }
});

/** Run a built-page check with isolated storage and guaranteed browser-context cleanup. */
async function withPage(width, run) {
  const context = await browser.newContext({
    viewport: { width, height: 800 },
    serviceWorkers: "block",
  });
  try {
    const page = await context.newPage();
    page.setDefaultTimeout(3000);
    // Every test owns a fresh document and storage. This suite does not claim
    // query-history or BFCache coverage; those have independent regressions.
    await page.route("**/*", (route) =>
      new URL(route.request().url()).origin === origin ? route.continue() : route.abort(),
    );
    await page.goto(`${origin}/search/`);
    await expect(page.locator("#theme-toggle")).toHaveAttribute("aria-label", /Switch to/);
    await run(page);
  } finally {
    await context.close();
  }
}

for (const width of [1280, 390]) {
  test(`${width}px: fresh page preserves document focus and exposes keyboard search`, async () => {
    await withPage(width, async (page) => {
      assert.equal(await page.evaluate(() => document.activeElement.tagName), "BODY");
      await page.keyboard.press("Tab");
      await expect(page.getByRole("link", { name: "Skip to content" })).toBeFocused();
      await page.keyboard.press("Enter");
      await expect(page.locator("main")).toBeFocused();
      await page.keyboard.press("Tab");
      await expect(page.getByRole("searchbox", { name: "Search", exact: true })).toBeFocused();
    });
  });

  test(`${width}px: Enter submission leaves focus in the field and results follow DOM order`, async () => {
    await withPage(width, async (page) => {
      const input = page.getByRole("searchbox", { name: "Search", exact: true });
      await input.focus();
      await page.keyboard.press("Enter");
      await expect(page.locator("#search-status")).toHaveText(`${index.data.length} results`);
      await expect(input).toBeFocused();
      await page.keyboard.press("Tab");
      await expect(page.locator("#search-form button")).toBeFocused();
      const results = page.locator("#search-results a");
      await expect(results).toHaveCount(index.data.length);
      for (const [resultIndex, note] of index.data.entries()) {
        await page.keyboard.press("Tab");
        const result = results.nth(resultIndex);
        await expect(result).toHaveText(note.title);
        await expect(result).toHaveAttribute("href", note.url);
        await expect(result).toBeFocused();
      }
      await page.keyboard.press("Tab");
      await expect(page.getByRole("link", { name: "RSS", exact: true })).toBeFocused();
      for (let resultIndex = index.data.length - 1; resultIndex >= 0; resultIndex--) {
        await page.keyboard.press("Shift+Tab");
        const note = index.data[resultIndex];
        const result = results.nth(resultIndex);
        await expect(result).toHaveText(note.title);
        await expect(result).toHaveAttribute("href", note.url);
        await expect(result).toBeFocused();
      }
      await page.keyboard.press("Shift+Tab");
      await expect(page.locator("#search-form button")).toBeFocused();
      await page.keyboard.press("Shift+Tab");
      await expect(input).toBeFocused();
    });
  });

  test(`${width}px: Escape in the native search field clears the edit and keeps focus`, async () => {
    await withPage(width, async (page) => {
      const input = page.getByRole("searchbox", { name: "Search", exact: true });
      await input.fill("unsubmitted edit");
      await page.keyboard.press("Escape");
      await expect(input).toHaveValue("");
      await expect(input).toBeFocused();
      await expect(page).toHaveURL(`${origin}/search/`);
      await expect(page.locator("#search-results a")).toHaveCount(0);
      // The empty-field Escape is also a no-navigation control.
      await page.keyboard.press("Escape");
      await expect(input).toBeFocused();
      await expect(page).toHaveURL(`${origin}/search/`);
    });
  });

  test(`${width}px: Escape on a result preserves its focus and Enter follows its link`, async () => {
    await withPage(width, async (page) => {
      const input = page.getByRole("searchbox", { name: "Search", exact: true });
      await input.focus();
      await page.keyboard.press("Enter");
      await expect(page.locator("#search-results a")).toHaveCount(index.data.length);
      await page.keyboard.press("Tab");
      await page.keyboard.press("Tab");
      const first = page.locator("#search-results a").first();
      await expect(first).toBeFocused();
      await page.keyboard.press("Escape");
      await expect(first).toBeFocused();
      await expect(page.locator("#search-results a")).toHaveCount(index.data.length);
      await expect(page).toHaveURL(`${origin}/search/`);
      await page.keyboard.press("Enter");
      await expect(page).toHaveURL(origin + index.data[0].url);
    });
  });

  for (const outcome of ["empty", "unavailable"]) {
    test(`${width}px: ${outcome} search keeps focus and has no result Tab stop`, async () => {
      await withPage(width, async (page) => {
        if (outcome === "unavailable")
          await page.route("**/search-index.json", (route) =>
            route.fulfill({ status: 503, body: "unavailable" }),
          );
        const input = page.getByRole("searchbox", { name: "Search", exact: true });
        if (outcome === "empty") {
          await input.focus();
          await page.keyboard.press("Enter");
          await expect(page.locator("#search-results a")).toHaveCount(index.data.length);
        }
        await input.fill("no-matching-note-keyboard-control");
        await page.keyboard.press("Enter");
        await expect(page.locator("#search-status")).toHaveText(
          outcome === "empty" ? "0 results" : "Search unavailable",
        );
        await expect(input).toBeFocused();
        await expect(page.locator("#search-results a")).toHaveCount(0);
        await page.keyboard.press("Tab");
        await expect(page.locator("#search-form button")).toBeFocused();
        await page.keyboard.press("Tab");
        await expect(page.getByRole("link", { name: "RSS", exact: true })).toBeFocused();
      });
    });
  }
}

test("390px: menu Escape returns focus to its toggle and releases the search field", async () => {
  await withPage(390, async (page) => {
    const toggle = page.getByRole("button", { name: "Open Menu", exact: true });
    await toggle.focus();
    await page.keyboard.press("Enter");
    await expect(page.getByRole("link", { name: "Posts", exact: true })).toBeFocused();
    assert.equal(await page.locator("main").evaluate((element) => element.inert), true);
    await page.keyboard.press("Tab");
    await page.keyboard.press("Tab");
    await expect(page.getByRole("link", { name: "Search", exact: true })).toBeFocused();
    await page.keyboard.press("Escape");
    await expect(toggle).toHaveAttribute("aria-expanded", "false");
    await expect(toggle).toBeFocused();
    assert.equal(await page.locator("main").evaluate((element) => element.inert), false);
    await page.keyboard.press("Tab");
    await expect(page.getByRole("searchbox", { name: "Search", exact: true })).toBeFocused();
  });
});
