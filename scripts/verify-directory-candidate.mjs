import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { readFile } from "node:fs/promises";

const receipt = JSON.parse(await readFile("DIRECTORY-CANDIDATE.json", "utf8"));
const sha = (value) => createHash("sha256").update(value).digest("hex");
assert.equal(sha(await readFile(receipt.baseArchive)), receipt.baseArchiveSha256);
assert.equal(sha(await readFile(receipt.patchFile)), receipt.patchSha256);
for (const [path, expected] of Object.entries(receipt.sourceFiles)) {
  assert.equal(sha(await readFile("node_modules/astromache/" + path)), expected, path);
}
const manifest = JSON.parse(await readFile("node_modules/astromache/package.json", "utf8"));
for (const [name, path] of Object.entries(receipt.exports)) {
  assert.equal(manifest.exports[name], path);
}
console.log("Directory source overlay matches producer source " + receipt.sourceCommit);
