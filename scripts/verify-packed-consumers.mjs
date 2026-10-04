import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { execFileSync } from "node:child_process";
import { cp, mkdir, mkdtemp, readFile, readdir, realpath, writeFile } from "node:fs/promises";
import { join, resolve } from "node:path";
import { tmpdir } from "node:os";

const root = await mkdtemp(
  join(process.env.ASTROMACHE_QUALIFICATION_ROOT ?? tmpdir(), "astromache-qualification-"),
);
const manager = resolve("node_modules/pnpm/bin/pnpm.cjs");
await mkdir(root, { recursive: true });
const run = await mkdtemp(join(root, "packed-"));
execFileSync(process.execPath, [manager, "pack", "--pack-destination", run], {
  cwd: "packages/astromache",
  stdio: "inherit",
});
const archive = (await readdir(run)).find((file) => file.endsWith(".tgz"));
assert.ok(archive);
const tarball = join(run, archive);
const dir = join(run, "neutral");
await mkdir(dir);
await cp("consumers/neutral/src", join(dir, "src"), { recursive: true });
await cp("patches", join(dir, "patches"), { recursive: true });
const manifest = JSON.parse(await readFile("consumers/neutral/package.json", "utf8"));
manifest.dependencies["@effortlessmetrics/astromache"] = `file:${tarball}`;
const workspacePackage = JSON.parse(await readFile("package.json", "utf8"));
manifest.devDependencies = {
  "@astrojs/ts-content-mapper": workspacePackage.devDependencies["@astrojs/ts-content-mapper"],
  "@types/node": workspacePackage.devDependencies["@types/node"],
  "typescript-native": workspacePackage.devDependencies["typescript-native"],
};
manifest.pnpm = workspacePackage.pnpm;
await writeFile(join(dir, "package.json"), JSON.stringify(manifest, null, 2));
await writeFile(join(dir, "pnpm-workspace.yaml"), "packages:\n  - .\n");
const native = JSON.parse(await readFile("tsconfig.native.json", "utf8"));
delete native.extends;
native.compilerOptions = {
  ...JSON.parse(await readFile("tsconfig.json", "utf8")).compilerOptions,
  ...native.compilerOptions,
};
native.include = ["src/**/*.astro", "src/**/*.ts"];
await writeFile(join(dir, "tsconfig.native.json"), JSON.stringify(native, null, 2));
execFileSync(
  process.execPath,
  [manager, "install", "--ignore-scripts", "--store-dir", join(root, "store")],
  { cwd: dir, stdio: "inherit" },
);
const installed = await realpath(join(dir, "node_modules/@effortlessmetrics/astromache"));
assert.ok(installed.startsWith(dir), "Packed consumer must resolve an installed archive");
execFileSync(
  process.execPath,
  [
    join(dir, "node_modules/typescript-native/bin/tsc"),
    "--noEmit",
    "-p",
    "tsconfig.native.json",
    "--runExternalCode",
  ],
  { cwd: dir, stdio: "inherit" },
);
execFileSync(process.execPath, [manager, "build"], { cwd: dir, stdio: "inherit" });
const html = await readFile(join(dir, "dist/index.html"));
const workspace = await readFile("consumers/neutral/dist/index.html");
assert.deepEqual(html, workspace, "Packed and workspace outputs must match");
const receipt = {
  packageSha256: createHash("sha256")
    .update(await readFile(tarball))
    .digest("hex"),
  htmlBytes: html.length,
  htmlSha256: createHash("sha256").update(html).digest("hex"),
};
await writeFile(join(run, "receipt.json"), JSON.stringify(receipt, null, 2));
console.log("Independent packed native consumer receipt", JSON.stringify(receipt));
