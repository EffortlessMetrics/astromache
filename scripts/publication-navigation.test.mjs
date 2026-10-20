import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { stripTypeScriptTypes } from "node:module";
import { test } from "node:test";
import { runInNewContext } from "node:vm";

const layout = await readFile(new URL("../src/layouts/Publication.astro", import.meta.url), "utf8");
// The baseline has no listing-restoration hook: run an empty script so its
// regressions fail on the incorrect return destination, rather than extraction.
const source =
  [...layout.matchAll(/<script>([\s\S]*?)<\/script>/g)].find((match) =>
    match[1].includes("data-publication-return-key"),
  )?.[1] ?? "";
const script = stripTypeScriptTypes(source);
const setup = (pathname, keys, storageAvailable = true) => {
  const window = new EventTarget();
  const storage = new Map([["field-notes-back", "/search/"]]);
  runInNewContext(script, {
    window,
    location: { pathname, search: "?view=compact" },
    document: {
      querySelectorAll(selector) {
        assert.equal(selector, "[data-publication-return-key]");
        return keys.map((key) => ({ dataset: { publicationReturnKey: key } }));
      },
    },
    sessionStorage: {
      setItem(key, value) {
        if (!storageAvailable) throw new DOMException("Storage denied", "SecurityError");
        storage.set(key, value);
      },
    },
  });
  return {
    storage,
    show(persisted) {
      const event = new Event("pageshow");
      event.persisted = persisted;
      window.dispatchEvent(event);
    },
  };
};

for (const path of ["/posts/", "/tags/practice/"]) {
  test(`history-restored ${path} reclaims its article return destination`, () => {
    const ui = setup(path, ["field-notes-back"]);
    for (let visit = 0; visit < 2; visit++) {
      ui.storage.set("field-notes-back", "/search/");
      ui.show(true);
      assert.equal(ui.storage.get("field-notes-back"), path + "?view=compact");
    }
  });
}

test("pages without listing markers preserve the active return destination", () => {
  const ui = setup("/notes/example/", []);
  ui.show(false);
  ui.show(true);
  assert.equal(ui.storage.get("field-notes-back"), "/search/");
});

test("listing restoration tolerates denied session storage", () => {
  const ui = setup("/posts/", ["field-notes-back"], false);
  assert.doesNotThrow(() => ui.show(true));
});
