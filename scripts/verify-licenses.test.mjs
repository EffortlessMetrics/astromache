import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { cp, mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { test } from "node:test";

const source = process.cwd();
const names = [
  "astromache",
  "@effortlessmetrics/astro-offline",
  "@effortlessmetrics/static-search",
];
test("bundled receipts and exact registry upgrades bind installed identities", async () => {
  const root = await mkdtemp(join(tmpdir(), "astro-license-"));
  try {
    for (const file of ["package.json", "STARTER-DELIVERY.json", "licenses", "vendor"])
      await cp(join(source, file), join(root, file), { recursive: true });
    for (const name of names)
      await cp(join(source, "node_modules", name), join(root, "node_modules", name), {
        recursive: true,
        dereference: true,
      });
    const manifestPath = join(root, "package.json");
    const manifest = JSON.parse(await readFile(manifestPath, "utf8"));
    const run = () =>
      spawnSync(process.execPath, [resolve(source, "scripts/verify-licenses.mjs")], {
        cwd: root,
        encoding: "utf8",
      });
    const fails = (message) => {
      const result = run();
      assert.notEqual(result.status, 0);
      assert.match(result.stderr, message);
    };
    assert.equal(run().status, 0, "valid bundled delivery");

    // This mode uses the already installed candidate bytes to exercise the future
    // registry pin contract. It does not download or publish a registry release.
    for (const name of names) {
      const installed = JSON.parse(
        await readFile(join(root, "node_modules", name, "package.json"), "utf8"),
      );
      manifest.dependencies[name] = installed.version;
    }
    await writeFile(manifestPath, JSON.stringify(manifest));
    await rm(join(root, "STARTER-DELIVERY.json"));
    assert.equal(run().status, 0, "exact registry mode needs no historical bundled receipt");
    manifest.dependencies.astromache = "0.2.8";
    await writeFile(manifestPath, JSON.stringify(manifest));
    fails(/exact registry version must match installed version/);
    manifest.dependencies.astromache = "^0.2.7";
    await writeFile(manifestPath, JSON.stringify(manifest));
    fails(/registry dependency must use an exact version/);

    await cp(join(source, "package.json"), manifestPath);
    await cp(join(source, "STARTER-DELIVERY.json"), join(root, "STARTER-DELIVERY.json"));
    const installedPath = join(root, "node_modules/astromache/package.json");
    const installedBytes = await readFile(installedPath);
    const installed = JSON.parse(installedBytes);
    installed.name = "different-library";
    await writeFile(installedPath, JSON.stringify(installed));
    fails(/installed package name must match dependency/);
    await writeFile(installedPath, installedBytes);
    const receiptPath = join(root, "STARTER-DELIVERY.json");
    const receipt = JSON.parse(await readFile(receiptPath, "utf8"));
    const archivePath = join(root, receipt.archives.astromache.file);
    const archiveBytes = await readFile(archivePath);
    await writeFile(archivePath, Buffer.concat([archiveBytes, Buffer.from("corruption")]));
    fails(/archive must match its reviewed delivery hash/);
    await writeFile(archivePath, archiveBytes);
    receipt.archives.astromache.version = "0.2.8";
    await writeFile(receiptPath, JSON.stringify(receipt));
    fails(/installed delivery version/);
    receipt.archives.astromache.version = "0.2.7";
    receipt.archives.astromache.file = "vendor/other.tgz";
    await writeFile(receiptPath, JSON.stringify(receipt));
    fails(/delivery pin/);
    await cp(join(source, "STARTER-DELIVERY.json"), receiptPath);
    assert.equal(run().status, 0, "restored bundled delivery");
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});
