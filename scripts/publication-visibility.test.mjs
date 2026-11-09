import assert from "node:assert/strict";
import { test } from "node:test";
import { isPublished } from "../src/publication-visibility.mjs";

const now = Date.parse("2026-11-09T12:00:00Z");
const data = (offset, draft) => ({ published: new Date(now + offset), draft });

test("drafts remain hidden regardless of date", () => {
  for (const offset of [-1, 0, 1]) assert.equal(isPublished(data(offset, true), now), false);
});
test("existing unmarked and explicit non-drafts publish at the exact scheduled instant", () => {
  for (const draft of [undefined, false]) {
    assert.equal(isPublished(data(-1, draft), now), true);
    assert.equal(isPublished(data(0, draft), now), true);
    assert.equal(isPublished(data(1, draft), now), false);
  }
});
test("invalid dates fail closed and equivalent timezone instants agree", () => {
  assert.equal(isPublished({ published: new Date(NaN) }, now), false);
  assert.equal(isPublished({ published: new Date("2026-11-09T07:00:00-05:00") }, now), true);
});

test("the default publication cutoff stays fixed after module initialization", () => {
  const original = Date.now;
  try {
    Date.now = () => Date.parse("9999-12-31T23:59:59Z");
    assert.equal(isPublished({ published: new Date("9999-01-01T00:00:00Z") }), false);
  } finally {
    Date.now = original;
  }
});
