import assert from "node:assert/strict";
import { readFile, writeFile, readdir } from "node:fs/promises";
import { createHash } from "node:crypto";
import { execFileSync } from "node:child_process";
import { join } from "node:path";
const sha = (bytes) => createHash("sha256").update(bytes).digest("hex");
const read = (path) => readFile(join("dist", path), "utf8");
const build = () =>
  execFileSync("pnpm", ["build"], {
    stdio: "inherit",
    env: { ...process.env, ASTRO_TELEMETRY_DISABLED: "1" },
  });
async function verifyEnabled() {
  const report = JSON.parse(await read("_meta/astromache-publication.json"));
  assert.ok(
    report.documents.some((item) => new URL(item.canonical).pathname === "/"),
    "homepage publishes Markdown",
  );
  const articles = report.documents.filter((item) =>
    new URL(item.canonical).pathname.startsWith("/notes/"),
  );
  assert.ok(articles.length > 0, "published notes have alternates");
  for (const item of report.html)
    assert.equal(sha(await read(item.path)), item.sha256, `HTML unchanged: ${item.path}`);
  for (const item of report.documents) {
    const html = await read(item.html);
    const markdown = await read(decodeURIComponent(new URL(item.markdown).pathname.slice(1)));
    assert.equal(sha(markdown), item.sha256);
    assert.match(html, /rel="alternate"[^>]*type="text\/markdown"/);
    assert.ok(html.includes(item.markdown));
    assert.ok(markdown.includes(item.canonical));
    assert.doesNotMatch(markdown, /<script|<style|<!--/i);
    assert.ok(
      !["/portfolio/", "/search/", "/404/", "/offline/"].includes(new URL(item.canonical).pathname),
    );
  }
  const searchBytes = await read("search-index.json");
  assert.equal(sha(searchBytes), report.searchSha256);
  const search = JSON.parse(searchBytes);
  assert.equal(search.version, sha(JSON.stringify(search.data)));
  assert.equal(search.data.length, articles.length);
  for (const row of search.data) {
    assert.doesNotMatch(row.text, /<!--|<script|^---/i);
    assert.ok(row.text.trim());
  }
  const headers = await readFile("public/_headers", "utf8");
  assert.match(headers, /\/_markdown\/\*\s+Content-Type: text\/markdown; charset=utf-8/);
  assert.match(headers, /no-transform/);
  assert.ok(
    !(await readdir("dist")).includes("_worker.js"),
    "Markdown does not add a runtime Worker",
  );
  console.log(
    JSON.stringify({
      check: "static publication",
      documents: report.documents.length,
      articles: articles.length,
      htmlHashes: report.html.length,
      searchHash: report.searchSha256,
    }),
  );
}
await verifyEnabled();
const original = await readFile("site.config.mjs", "utf8");
const policy = /export const publicationPolicy = \{\s*markdown: true[,\s]*\};/;
assert.match(original, policy, "the default is one explicit enabled policy");
try {
  await writeFile(
    "site.config.mjs",
    original.replace(policy, "export const publicationPolicy = { markdown: false };"),
  );
  build();
  const disabled = JSON.parse(await read("_meta/astromache-publication.json"));
  assert.deepEqual(disabled.documents, []);
  await assert.rejects(readdir("dist/_markdown"), { code: "ENOENT" });
  for (const item of disabled.html)
    assert.doesNotMatch(await read(item.path), /type="text\/markdown"/);
  assert.ok((await read("index.html")).includes("<main"));
  console.log("Disabled build retains HTML and removes all Markdown files and advertisements");
} finally {
  await writeFile("site.config.mjs", original);
  build();
}
await verifyEnabled();
