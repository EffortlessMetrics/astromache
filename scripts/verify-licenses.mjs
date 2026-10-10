import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { access, readFile } from "node:fs/promises";
import { join } from "node:path";
const root = process.cwd();
const application = JSON.parse(await readFile(join(root, "package.json"), "utf8"));
assert.equal(application.private, true);
assert.equal(application.license, "UNLICENSED", "Application/content license belongs to its owner");
for (const name of ["LICENSE", "LICENSE-MIT", "LICENSE-APACHE"]) {
  await assert.rejects(access(join(root, name)), { code: "ENOENT" });
  assert.ok((await readFile(join(root, "licenses/template", name), "utf8")).length > 100);
}
assert.match(
  await readFile(join(root, "licenses/template/README.md"), "utf8"),
  /does not license.*replacement content/,
);
for (const name of [
  "astromache",
  "@effortlessmetrics/astro-offline",
  "@effortlessmetrics/static-search",
]) {
  assert.ok(name in application.dependencies, `${name} dependency is required by this starter`);
  const dependency = JSON.parse(
    await readFile(join(root, "node_modules", name, "package.json"), "utf8"),
  );
  assert.equal(dependency.name, name, `${name} installed package name must match dependency`);
  const declared = application.dependencies[name];
  if (declared.startsWith("file:")) {
    const delivery = JSON.parse(await readFile(join(root, "STARTER-DELIVERY.json"), "utf8"));
    const archive = delivery.archives?.[name];
    assert.ok(archive, `${name} bundled receipt is required`);
    assert.equal(declared, `file:${archive.file}`, `${name} delivery pin`);
    assert.equal(
      createHash("sha256")
        .update(await readFile(join(root, archive.file)))
        .digest("hex"),
      archive.sha256,
      `${name} archive must match its reviewed delivery hash`,
    );
    assert.equal(dependency.version, archive.version, `${name} installed delivery version`);
  } else {
    assert.match(
      declared,
      /^(0|[1-9]\d*)\.(0|[1-9]\d*)\.(0|[1-9]\d*)(?:-[0-9A-Za-z-]+(?:\.[0-9A-Za-z-]+)*)?(?:\+[0-9A-Za-z-]+(?:\.[0-9A-Za-z-]+)*)?$/,
      `${name} registry dependency must use an exact version`,
    );
    assert.equal(
      dependency.version,
      declared,
      `${name} exact registry version must match installed version`,
    );
  }
  assert.equal(dependency.license, "MIT OR Apache-2.0", "Preserve dependency terms independently");
  for (const notice of ["LICENSE-MIT", "LICENSE-APACHE"])
    assert.ok((await readFile(join(root, "node_modules", name, notice), "utf8")).length > 1000);
}
console.log(
  "Active dependency identities verified; application UNLICENSED; upstream notices and dependency grants retained.",
);
