import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { cp, mkdtemp, readFile, realpath } from "node:fs/promises";
import { delimiter, dirname, join, relative, resolve, sep } from "node:path";
import { tmpdir } from "node:os";
import { fileURLToPath } from "node:url";
import { verifyPublicationBrowser } from "./verify-publication-browser.mjs";

const producer = await realpath(fileURLToPath(new URL("../", import.meta.url)));
const manager = join(producer, "node_modules/pnpm/bin/pnpm.cjs");
assert.match(process.version, /^v24\./, "Use the qualification Node 24 toolchain");
const root = await realpath(
  await mkdtemp(join(process.env.RUNNER_TEMP ?? tmpdir(), "astromache-products-")),
);
assert.ok(
  !relative(producer, root).startsWith(`.${sep}`) && !root.startsWith(producer + sep),
  "Products must be copied outside producer",
);
const excluded = new Set([
  "node_modules",
  "dist",
  ".astro",
  ".git",
  ".qualification",
  "qualification-receipts",
  "receipts",
]);
const products = [
  ["starters/publication", false],
  ["recipes/search-offline", true],
];
for (const [source, recipe] of products.filter(
  ([, recipe]) => !process.argv.includes("--recipe-only") || recipe,
)) {
  const directory = resolve(root, recipe ? "recipe" : "starter");
  await cp(join(producer, source), directory, {
    recursive: true,
    filter: (path) =>
      !relative(join(producer, source), path)
        .split(sep)
        .some((part) => excluded.has(part)),
  });
  const manifest = JSON.parse(await readFile(join(directory, "package.json"), "utf8"));
  assert.equal(
    manifest.pnpm?.overrides,
    undefined,
    "Ordinary Astro product must not override Vite",
  );
  assert.equal(
    manifest.pnpm?.patchedDependencies,
    undefined,
    "Ordinary Astro product must not patch compiler",
  );
  const run = (args) =>
    execFileSync(process.execPath, [manager, ...args], {
      cwd: directory,
      stdio: "inherit",
      timeout: 300000,
      env: {
        ...process.env,
        PATH: `${dirname(process.execPath)}${delimiter}${process.env.PATH ?? process.env.Path ?? ""}`,
      },
    });
  run(["install", "--frozen-lockfile", "--ignore-scripts"]);
  run(["qualify"]);
  await verifyPublicationBrowser(directory, { recipe });
  console.log(
    `Independent ${source}: frozen installation, ordinary Astro qualification and browser flows passed (${directory})`,
  );
}
