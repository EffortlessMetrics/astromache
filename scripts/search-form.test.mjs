import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { stripTypeScriptTypes } from "node:module";
import { test } from "node:test";
import { runInNewContext } from "node:vm";
import {
  createStaticIndexLoader,
  createStaticSearchBackend,
} from "@effortlessmetrics/static-search";

// Execute the actual page script with the installed backend and a controlled
// network. Only the browser's DOM/event surface is replaced for these tests.
const page = await readFile(new URL("../src/pages/search.astro", import.meta.url), "utf8");
const script = stripTypeScriptTypes(page.match(/<script>([\s\S]*?)<\/script>/)[1]).replace(
  /import\s*\{[^}]+\}\s*from\s*["']@effortlessmetrics\/static-search["'];?/,
  "",
);
class Element extends EventTarget {
  value = "";
  textContent = "";
  children = [];
  attributes = new Map();
  append(...children) {
    this.children.push(...children);
  }
  replaceChildren(...children) {
    this.children = children;
  }
  setAttribute(name, value) {
    this.attributes.set(name, value);
  }
  getAttribute(name) {
    return this.attributes.get(name) ?? null;
  }
}
const deferred = () => {
  let resolve;
  const promise = new Promise((done) => (resolve = done));
  return { promise, resolve };
};
const settle = async (condition) => {
  for (let attempt = 0; attempt < 50; attempt++) {
    if (condition()) return;
    await new Promise((resolve) => setImmediate(resolve));
  }
  assert.ok(condition(), "Search state did not settle");
};
const snapshot = () =>
  Response.json({
    version: "fixture-v1",
    data: [
      { title: "Alpha <note>", text: "first", url: "/notes/alpha/" },
      { title: "Beta", text: "second", url: "/notes/beta/" },
    ],
  });
const setup = (t, fetch, storageAvailable = true) => {
  const elements = Object.fromEntries(
    ["search-form", "query", "search-status", "search-results"].map((id) => [id, new Element()]),
  );
  const window = new EventTarget();
  const storage = new Map();
  const lifecycle = (type, persisted) => {
    const event = new Event(type);
    event.persisted = persisted;
    window.dispatchEvent(event);
  };
  const hide = (persisted) => lifecycle("pagehide", persisted);
  runInNewContext(script, {
    document: {
      querySelector: (selector) => elements[selector.slice(1)],
      createElement: () => new Element(),
    },
    window,
    location: { pathname: "/search/", search: "" },
    sessionStorage: {
      getItem: (key) => {
        if (!storageAvailable) throw new DOMException("Storage denied", "SecurityError");
        return storage.get(key) ?? null;
      },
      setItem: (key, value) => {
        if (!storageAvailable) throw new DOMException("Storage denied", "SecurityError");
        storage.set(key, value);
      },
    },
    fetch,
    AbortController,
    DOMException,
    createStaticIndexLoader,
    createStaticSearchBackend,
  });
  t.after(() => hide(false));
  return {
    form: elements["search-form"],
    status: elements["search-status"],
    list: elements["search-results"],
    input: elements.query,
    storage,
    hide,
    show: (persisted) => lifecycle("pageshow", persisted),
    submit(query) {
      elements.query.value = query;
      const event = new Event("submit", { cancelable: true });
      elements["search-form"].dispatchEvent(event);
      assert.equal(event.defaultPrevented, true);
    },
  };
};
const pending = (ui) => {
  assert.equal(ui.status.textContent, "Searching…");
  assert.equal(ui.form.getAttribute("aria-busy"), "true");
  assert.equal(ui.list.children.length, 0);
};

test("a pending query announces progress and replaces previous results", async (t) => {
  const response = deferred();
  const ui = setup(t, () => response.promise);
  ui.submit("alpha");
  pending(ui);
  response.resolve(snapshot());
  await settle(() => ui.status.textContent === "1 results");
  assert.equal(ui.form.getAttribute("aria-busy"), "false");
  assert.equal(ui.list.children[0].children[0].textContent, "Alpha <note>");
  assert.equal(ui.list.children[0].children[0].href, "/notes/alpha/");
  ui.submit("no match");
  pending(ui);
  await settle(() => ui.status.textContent === "0 results");
  assert.equal(ui.form.getAttribute("aria-busy"), "false");
  assert.equal(ui.list.children.length, 0);
});

test("retry replaces a prior failure with progress, then recovers", async (t) => {
  const retry = deferred();
  let requests = 0;
  const ui = setup(t, () => (++requests === 1 ? new Response("", { status: 503 }) : retry.promise));
  ui.submit("alpha");
  await settle(() => ui.status.textContent === "Search unavailable");
  assert.equal(ui.form.getAttribute("aria-busy"), "false");
  assert.equal(ui.list.children.length, 0);
  ui.submit("beta");
  pending(ui);
  retry.resolve(snapshot());
  await settle(() => ui.status.textContent === "1 results");
  assert.equal(ui.form.getAttribute("aria-busy"), "false");
  assert.equal(ui.list.children[0].children[0].textContent, "Beta");
});

test("a malformed index is rejected before caching so the next submission can recover", async (t) => {
  const invalid = [
    null,
    { version: "", data: [] },
    { version: "invalid-v1", data: {} },
    { version: "invalid-v1", data: [null] },
    { version: "invalid-v1", data: [{ text: "alpha", url: "/notes/alpha/" }] },
    { version: "invalid-v1", data: [{ title: "Alpha", text: 7, url: "/notes/alpha/" }] },
    { version: "invalid-v1", data: [{ title: "Alpha", text: "first", url: null }] },
    ...[
      "javascript:globalThis.__searchExecuted=true;void 0",
      "data:text/html,<script>alert(1)</script>",
      "https://attacker.invalid/notes/alpha/",
      "//attacker.invalid/notes/alpha/",
    ].map((url) => ({ version: "invalid-v1", data: [{ title: "Alpha", text: "first", url }] })),
  ];
  for (const payload of invalid) {
    await t.test(JSON.stringify(payload), async (t) => {
      let requests = 0;
      const ui = setup(t, () => (++requests === 1 ? Response.json(payload) : snapshot()));
      ui.submit("alpha");
      await settle(() => ui.form.getAttribute("aria-busy") === "false");
      assert.equal(ui.status.textContent, "Search unavailable");
      assert.equal(ui.list.children.length, 0);
      ui.submit("beta");
      await settle(() => ui.form.getAttribute("aria-busy") === "false");
      assert.equal(requests, 2, "Retry must refetch after an invalid index");
      assert.equal(ui.status.textContent, "1 results");
      assert.equal(ui.list.children[0].children[0].textContent, "Beta");
      assert.equal(ui.list.children[0].children[0].href, "/notes/beta/");
    });
  }
});

test("serialized Unicode and reserved-character note links remain unchanged", async (t) => {
  const note = {
    title: "Café <note>",
    text: "first",
    url: "/notes/caf%C3%A9/%E6%9D%B1%E4%BA%AC/query%3Fx=1&y=2%23part/",
  };
  const ui = setup(t, () => Response.json({ version: "encoded-v1", data: [note] }));
  ui.submit("café");
  await settle(() => ui.form.getAttribute("aria-busy") === "false");
  assert.equal(ui.status.textContent, "1 results");
  assert.equal(ui.list.children[0].children[0].textContent, note.title);
  assert.equal(ui.list.children[0].children[0].href, note.url);
});

test("valid indexes including an empty corpus remain cached across submissions", async (t) => {
  for (const empty of [false, true]) {
    await t.test(empty ? "empty corpus" : "populated corpus", async (t) => {
      let requests = 0;
      const ui = setup(t, () => {
        requests++;
        return empty ? Response.json({ version: "empty-v1", data: [] }) : snapshot();
      });
      for (const query of ["alpha", "beta"]) {
        ui.submit(query);
        await settle(() => ui.form.getAttribute("aria-busy") === "false");
        assert.equal(ui.status.textContent, empty ? "0 results" : "1 results");
        assert.equal(ui.list.children.length, empty ? 0 : 1);
      }
      assert.equal(requests, 1, "A valid index must retain the existing shared cache behavior");
    });
  }
});

test("a superseded query cannot clear the current pending state", async (t) => {
  const response = deferred();
  const ui = setup(t, () => response.promise);
  ui.submit("alpha");
  ui.submit("beta");
  await new Promise((resolve) => setImmediate(resolve));
  pending(ui);
  response.resolve(snapshot());
  await settle(() => ui.status.textContent === "1 results");
  assert.equal(ui.form.getAttribute("aria-busy"), "false");
  assert.equal(ui.list.children[0].children[0].textContent, "Beta");
});

test("pagehide clears pending UI and a restored page can search again", async (t) => {
  const response = deferred();
  const ui = setup(t, () => response.promise);
  ui.submit("alpha");
  pending(ui);
  ui.hide(true);
  assert.equal(ui.status.textContent, "");
  assert.equal(ui.form.getAttribute("aria-busy"), "false");
  response.resolve(snapshot());
  await new Promise((resolve) => setImmediate(resolve));
  assert.equal(ui.status.textContent, "");
  assert.equal(ui.list.children.length, 0);
  ui.submit("beta");
  await settle(() => ui.status.textContent === "1 results");
  assert.equal(ui.list.children[0].children[0].textContent, "Beta");
});

test("submitted queries retain literal text and the article return destination", async (t) => {
  const ui = setup(t, () => snapshot());
  for (const query of ["alpha", "Café & 東京 ? # + %", ""]) {
    ui.submit(query);
    await settle(() => ui.form.getAttribute("aria-busy") === "false");
    assert.equal(ui.storage.get("field-notes-search-query"), query);
    assert.equal(ui.storage.get("field-notes-back"), "/search/");
  }
});

test("returning to search restores its literal query and recovers after an invalid index", async (t) => {
  const query = "Café & 東京 ? # + %";
  let requests = 0;
  const ui = setup(t, () => (++requests === 1 ? Response.json(null) : snapshot()));
  ui.storage.set("field-notes-search-query", query);
  ui.show(false);
  assert.equal(ui.input.value, query);
  pending(ui);
  await settle(() => ui.status.textContent === "Search unavailable");
  ui.submit("beta");
  await settle(() => ui.status.textContent === "1 results");
  assert.equal(requests, 2);
  assert.equal(ui.list.children[0].children[0].textContent, "Beta");
  assert.equal(ui.storage.get("field-notes-search-query"), "beta");
});

test("history restoration refreshes search return context without replaying a completed failure", async (t) => {
  let requests = 0;
  const ui = setup(t, () => {
    requests++;
    return new Response("", { status: 503 });
  });
  ui.submit("alpha");
  await settle(() => ui.status.textContent === "Search unavailable");
  for (let visit = 0; visit < 2; visit++) {
    ui.hide(true);
    ui.storage.set("field-notes-back", "/posts/");
    ui.storage.set("field-notes-search-query", "beta");
    ui.show(true);
    assert.equal(ui.storage.get("field-notes-back"), "/search/");
    assert.equal(ui.storage.get("field-notes-search-query"), "alpha");
    assert.equal(ui.input.value, "alpha");
    assert.equal(ui.status.textContent, "Search unavailable");
    assert.equal(ui.form.getAttribute("aria-busy"), "false");
  }
  assert.equal(requests, 1, "Retained failures wait for an explicit retry");
});

test("a restored search cancels a pending retry and admits only the latest query", async (t) => {
  const response = deferred();
  let requests = 0;
  const ui = setup(t, () => (++requests === 1 ? Response.json(null) : response.promise));
  ui.storage.set("field-notes-search-query", "alpha");
  ui.show(false);
  await settle(() => ui.status.textContent === "Search unavailable");
  ui.submit("alpha");
  pending(ui);
  ui.hide(true);
  ui.show(true);
  assert.equal(ui.status.textContent, "");
  assert.equal(ui.form.getAttribute("aria-busy"), "false");
  ui.submit("beta");
  response.resolve(snapshot());
  await settle(() => ui.status.textContent === "1 results");
  assert.equal(requests, 2, "Cancellation must retain the shared index load");
  assert.equal(ui.list.children[0].children[0].textContent, "Beta");
  ui.input.value = "unsubmitted edit";
  ui.hide(true);
  ui.storage.set("field-notes-search-query", "alpha");
  ui.show(true);
  assert.equal(ui.storage.get("field-notes-search-query"), "beta");
  assert.equal(ui.list.children[0].children[0].textContent, "Beta");
});

test("an initial visit stays idle and searching still works when session storage is denied", async (t) => {
  let requests = 0;
  const ui = setup(
    t,
    () => {
      requests++;
      return snapshot();
    },
    false,
  );
  ui.show(false);
  assert.equal(requests, 0);
  assert.equal(ui.status.textContent, "");
  ui.submit("alpha");
  await settle(() => ui.status.textContent === "1 results");
  assert.equal(ui.list.children[0].children[0].textContent, "Alpha <note>");
});
