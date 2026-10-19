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
const setup = (t, fetch) => {
  const elements = Object.fromEntries(
    ["search-form", "query", "search-status", "search-results"].map((id) => [id, new Element()]),
  );
  const window = new EventTarget();
  const hide = (persisted) => {
    const event = new Event("pagehide");
    event.persisted = persisted;
    window.dispatchEvent(event);
  };
  runInNewContext(script, {
    document: {
      querySelector: (selector) => elements[selector.slice(1)],
      createElement: () => new Element(),
    },
    window,
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
    hide,
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
