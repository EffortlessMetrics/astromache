import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { test } from "node:test";

const script = `import { normalizePublished } from './src/normalize-published.mjs';
for (const value of ['2026-10-02', '2026-10-02T00:00:00', '2026-10-02T00:00:00+09:00'])
  console.log(new Date(normalizePublished(value)).toISOString());`;

test("published dates resolve consistently across time zones", () => {
  for (const TZ of ["America/Los_Angeles", "Asia/Tokyo"]) {
    const result = spawnSync(process.execPath, ["--input-type=module", "-e", script], {
      env: { ...process.env, TZ },
      encoding: "utf8",
    });
    assert.equal(result.status, 0, result.stderr);
    assert.deepEqual(result.stdout.trim().split("\n"), [
      "2026-10-02T00:00:00.000Z",
      "2026-10-02T00:00:00.000Z",
      "2026-10-01T15:00:00.000Z",
    ]);
  }
});
