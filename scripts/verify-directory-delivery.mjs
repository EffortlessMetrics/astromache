import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { readFile } from "node:fs/promises";

const receipt = JSON.parse(await readFile("STARTER-DELIVERY.json", "utf8")).archives.astromache;
const manifest = JSON.parse(await readFile("package.json", "utf8"));
const sha = (value) => createHash("sha256").update(value).digest("hex");
const archive = await readFile(receipt.file);
assert.equal(manifest.dependencies.astromache, "file:" + receipt.file);
assert.equal(sha(archive), receipt.sha256);
assert.equal(archive.length, receipt.bytes);
assert.equal("sha512-" + createHash("sha512").update(archive).digest("base64"), receipt.integrity);
assert.equal(manifest.pnpm?.patchedDependencies?.["astromache@" + receipt.version], undefined);
for (const [path, expected] of Object.entries(receipt.sourceFiles)) {
  assert.equal(sha(await readFile("node_modules/astromache/" + path)), expected, path);
}
const installed = JSON.parse(await readFile("node_modules/astromache/package.json", "utf8"));
assert.equal(installed.version, receipt.version);
const lock = await readFile("pnpm-lock.yaml", "utf8");
assert.ok(lock.includes("    version: " + receipt.version + "\n"));
for (const [name, path] of Object.entries(receipt.exports)) {
  assert.equal(installed.exports[name], path);
}
console.log("Qualified directory archive and installed source match " + receipt.sourceCommit);
