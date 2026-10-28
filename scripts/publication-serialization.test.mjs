import assert from "node:assert/strict";
import { constants } from "node:fs";
import { after, before, test } from "node:test";
import { cp, mkdtemp, mkdir, readFile, rename, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { spawnSync } from "node:child_process";
import { EventEmitter } from "node:events";
import { stripTypeScriptTypes } from "node:module";
import { pathToFileURL } from "node:url";

const source = process.cwd();
let packagePool;
before(async () => {
  packagePool = await mkdtemp(join(tmpdir(), "astromache-feed-packages-"));
  await cp(join(source, "node_modules"), join(packagePool, "node_modules"), {
    recursive: true,
    verbatimSymlinks: true,
    mode: constants.COPYFILE_FICLONE,
  });
});
after(async () => {
  if (packagePool) await rm(packagePool, { recursive: true, force: true });
});
const env = {
  ...process.env,
  ASTRO_TELEMETRY_DISABLED: "1",
  RAYON_NUM_THREADS: "1",
  UV_THREADPOOL_SIZE: "1",
  OMP_NUM_THREADS: "1",
};
const fixture = (slug, title = "Fixture", description = "Fixture description") => ({
  title,
  description,
  ...(slug === undefined ? {} : { slug }),
  published: "2026-01-01",
  tags: ["Serialization"],
  category: "Serialization",
});
const writeNote = async (root, file, data) => {
  const path = join(root, "src/content/notes", file);
  await mkdir(join(path, ".."), { recursive: true });
  await writeFile(
    path,
    "---\n" +
      Object.entries(data)
        .map(([key, value]) => `${key}: ${JSON.stringify(value)}`)
        .join("\n") +
      "\n---\n\nDisposable fixture.\n",
  );
};
const build = (root, environment = {}) =>
  spawnSync(
    process.execPath,
    ["--max-old-space-size=1024", join(root, "node_modules/astro/bin/astro.mjs"), "build"],
    {
      cwd: root,
      env: { ...env, ...environment },
      encoding: "utf8",
      timeout: 90_000,
      maxBuffer: 2 * 1024 * 1024,
    },
  );
const withProject = async (entries, check) => {
  const root = await mkdtemp(join(tmpdir(), "astromache-feed-test-"));
  try {
    for (const file of [
      "src",
      "public",
      "astro.config.mjs",
      "site.config.mjs",
      "package.json",
      "tsconfig.json",
    ])
      await cp(join(source, file), join(root, file), { recursive: true });
    // Keep dependencies inside each fixture root for Astro virtual modules.
    // Tests run sequentially, so one private copy can move between roots.
    await rename(join(packagePool, "node_modules"), join(root, "node_modules"));
    await rm(join(root, "node_modules/.astro"), { recursive: true, force: true });
    await rm(join(root, "src/content/notes"), { recursive: true });
    for (const [file, data] of Object.entries(entries)) await writeNote(root, file, data);
    await check(root);
  } finally {
    await rename(join(root, "node_modules"), join(packagePool, "node_modules"));
    await rm(root, { recursive: true, force: true });
  }
};
const rejected = (result, message) => {
  assert.equal(result.error, undefined, `Build execution limit/error: ${result.error}`);
  assert.notEqual(result.status, 0, "Invalid note content must fail content sync");
  assert.match(result.stdout + result.stderr, message);
};

test("RSS, sitemap, HTML and copy links agree for XML text, Unicode and reserved slugs", async () => {
  const title = `  <Lab> & "café" '東京' 😀  `;
  const description = `  <tag> & "résumé" '雪'  `;
  const entries = {
    "text.md": fixture("xml-text", title, description),
    "amp.md": fixture("r&d", "Ampersand"),
    "unicode.md": fixture("café/東京-😀", "Unicode"),
    "decomposed.md": fixture("cafe\u0301-alone", "Decomposed Unicode"),
    "space.md": fixture("space name", "Space"),
    "query.md": fixture("query?x=1&y=2", "Query"),
    "fragment.md": fixture("fragment#part", "Fragment"),
    "nested/Note With Spaces.md": fixture(undefined, "Generated nested ID"),
  };
  await withProject(entries, async (root) => {
    const result = build(root);
    assert.equal(result.error, undefined);
    assert.equal(result.status, 0, result.stdout + result.stderr);
    // Python's standard XML parser independently checks actual emitted XML.
    const inspect = spawnSync(
      "python3",
      [
        "-c",
        `
import json, pathlib, sys, xml.etree.ElementTree as ET
from html.parser import HTMLParser
root = pathlib.Path(sys.argv[1])
class Head(HTMLParser):
 def __init__(self):
  super().__init__(); self.data = {}
 def handle_starttag(self, tag, attrs):
  a = dict(attrs)
  if tag == 'meta' and a.get('property') == 'og:title': self.data['title'] = a['content'].removesuffix(' / Field Notes')
  if tag == 'link' and a.get('rel') == 'canonical': self.data['canonical'] = a['href']
  if tag == 'button' and 'copy-link-btn' in a.get('class', '').split(): self.data['copy'] = a['data-url']
pages = []
for file in (root/'dist/notes').rglob('*.html'):
 head = Head(); head.feed(file.read_text()); pages.append(head.data)
rss = ET.parse(root/'dist/rss.xml')
sitemap = ET.parse(root/'dist/sitemap.xml')
index = ET.parse(root/'dist/sitemap-index.xml')
print(json.dumps({'items': [{key: item.findtext(key) for key in ['title','description','link','guid']} for item in rss.findall('./channel/item')],
 'locs': [node.text for node in sitemap.findall('{*}url/{*}loc')],
 'index': [node.text for node in index.findall('{*}sitemap/{*}loc')], 'pages': pages}))
`,
        root,
      ],
      { encoding: "utf8", timeout: 10_000 },
    );
    assert.equal(inspect.status, 0, inspect.stderr);
    const output = JSON.parse(inspect.stdout);
    assert.equal(output.items.length, Object.keys(entries).length);
    assert.equal(output.pages.length, Object.keys(entries).length);
    const expected = new Map([
      [title, "xml-text"],
      ["Ampersand", "r&d"],
      ["Unicode", "caf%C3%A9/%E6%9D%B1%E4%BA%AC-%F0%9F%98%80"],
      ["Decomposed Unicode", "caf%C3%A9-alone"],
      ["Space", "space%20name"],
      ["Query", "query%3Fx=1&y=2"],
      ["Fragment", "fragment%23part"],
      ["Generated nested ID", "nested/note-with-spaces"],
    ]);
    for (const item of output.items) {
      const url = `https://publication.example/notes/${expected.get(item.title)}/`;
      assert.equal(item.link, url);
      assert.equal(item.guid, url);
      assert.equal(output.locs.filter((loc) => loc === url).length, 1);
      assert.deepEqual(
        output.pages.find((page) => page.title === item.title),
        { title: item.title, canonical: url, copy: url },
      );
    }
    assert.equal(output.items.find((item) => item.title === title).description, description);
    assert.deepEqual(output.index, ["https://publication.example/sitemap.xml"]);
    const search = JSON.parse(await readFile(join(root, "dist/search-index.json"), "utf8"));
    assert.equal(search.data.find((entry) => entry.url === "/notes/xml-text/").title, title);
    assert.deepEqual(
      new Set(search.data.map((entry) => "https://publication.example" + entry.url)),
      new Set(output.items.map((entry) => entry.link)),
    );
  });
});

test("blank titles are rejected at content sync before publishing unnamed links", async () => {
  for (const title of ["", " \t\n ", "\u00a0\u2003"]) {
    await withProject({ "blank-title.md": fixture("blank-title", title) }, async (root) => {
      const result = build(root);
      const output = result.stdout + result.stderr;
      rejected(result, /Note title must contain non-whitespace text/);
      assert.match(output, /title/);
      assert.match(output, /blank-title/);
      assert.doesNotMatch(output, /generating static routes|Publication metadata requires/);
    });
  }
});

test("non-date published values fail content sync instead of becoming timestamps", async (t) => {
  for (const published of [null, false, true, 0, 20261028, [0]]) {
    await t.test(`published: ${JSON.stringify(published)}`, async () => {
      await withProject(
        { "invalid-date.md": { ...fixture("invalid-date"), published } },
        async (root) => {
          const result = build(root);
          rejected(result, /published/);
          assert.match(result.stdout + result.stderr, /invalid-date/);
          assert.doesNotMatch(result.stdout + result.stderr, /generating static routes/);
        },
      );
    });
  }
});

test("valid quoted and YAML dates retain their instants in articles and RSS", async () => {
  const dates = [
    ["date-only", "2026-10-02", "2026-10-02T00:00:00.000Z"],
    ["yaml-date", "2026-10-02", "2026-10-02T00:00:00.000Z"],
    ["local-time", "2026-10-02T00:00:00", "2026-10-02T00:00:00.000Z"],
    ["lowercase-time", "2024-03-10t02:30:00", "2024-03-10T02:30:00.000Z"],
    ["lowercase-offset", "2024-03-10t02:30:00+09:00", "2024-03-09T17:30:00.000Z"],
    ["yaml-time", "2026-10-02T00:00:00Z", "2026-10-02T00:00:00.000Z"],
    ["offset", "2026-10-02T00:00:00+09:00", "2026-10-01T15:00:00.000Z"],
  ];
  for (const TZ of ["UTC", "America/Los_Angeles", "Asia/Tokyo"]) {
    const entries = Object.fromEntries(
      dates.map(([id, published]) => [id + ".md", { ...fixture(id, id), published }]),
    );
    await withProject(entries, async (root) => {
      for (const id of ["yaml-date", "yaml-time"]) {
        const file = join(root, "src/content/notes", id + ".md");
        const text = await readFile(file, "utf8");
        await writeFile(file, text.replace(/published: "([^"]+)"/, "published: $1"));
      }
      const result = build(root, { TZ });
      assert.equal(result.error, undefined);
      assert.equal(result.status, 0, result.stdout + result.stderr);
      const rss = await readFile(join(root, "dist/rss.xml"), "utf8");
      for (const [id, , instant] of dates) {
        const html = await readFile(join(root, "dist/notes", id, "index.html"), "utf8");
        assert.equal(
          html.match(/<time\b[^>]*\bdatetime="([^"]+)"/)?.[1],
          instant,
          `${TZ}: ${id} article date`,
        );
        if (id === "lowercase-time") assert.match(html, />10 Mar 2024</);
        const item = rss.match(
          new RegExp(`<item><title>${id}</title>.*?<pubDate>([^<]+)</pubDate>`),
        );
        assert.equal(item?.[1], new Date(instant).toUTCString(), `${TZ}: ${id} feed date`);
      }
    });
  }
});

test("blank descriptions are rejected at content sync with the note and field identified", async () => {
  for (const description of ["", " \t\n ", "\u00a0\u2003"]) {
    await withProject({ "blank.md": fixture("blank", "Fixture", description) }, async (root) => {
      const result = build(root);
      const output = result.stdout + result.stderr;
      rejected(result, /Note description must contain non-whitespace text/);
      assert.match(output, /description/);
      assert.match(output, /blank/);
      assert.doesNotMatch(output, /generating static routes|Publication metadata requires/);
    });
  }
});

test("identical explicit duplicate slugs are rejected before collection overwrite", async () => {
  await withProject({ "one.md": fixture("same"), "two.md": fixture("same") }, async (root) => {
    const result = build(root);
    rejected(result, /Note path collision:/);
    assert.match(result.stdout + result.stderr, /one\.md/);
    assert.match(result.stdout + result.stderr, /two\.md/);
    assert.match(result.stdout + result.stderr, /\/notes\/same\//);
  });
});

test("native filename-generated ID collisions are rejected", async () => {
  await withProject(
    { "Hello World.md": fixture(undefined), "hello-world.md": fixture(undefined) },
    async (root) => {
      rejected(build(root), /Note path collision:.*\/notes\/hello-world\//);
    },
  );
});

test("dot-segment aliases are rejected clearly", async () => {
  await withProject(
    { "direct.md": fixture("same"), "dot.md": fixture("x/../same") },
    async (root) => {
      rejected(build(root), /Invalid note ID.*dot segments/);
    },
  );
});

test("literal percent slugs fail at validation rather than Astro route matching", async () => {
  await withProject({ "percent.md": fixture("literal%25") }, async (root) => {
    const result = build(root);
    rejected(result, /Unsupported note ID.*percent signs.*Astro note routes/);
    assert.doesNotMatch(result.stdout + result.stderr, /NoMatchingStaticPathFound/);
  });
});

test("encoded Unicode aliases cannot publish duplicate canonicals", async () => {
  await withProject(
    { "encoded.md": fixture("caf%C3%A9"), "literal.md": fixture("café") },
    async (root) => {
      rejected(build(root), /Unsupported note ID.*percent signs.*Astro note routes/);
    },
  );
});

test("composed and decomposed Unicode IDs cannot share a canonical path", async () => {
  await withProject(
    { "composed.md": fixture("café"), "decomposed.md": fixture("cafe\u0301") },
    async (root) => {
      rejected(build(root), /Note path collision:.*\/notes\/caf%C3%A9\//);
    },
  );
});

test("a cached identical duplicate is still rejected on the next sync", async () => {
  await withProject({ "one.md": fixture("same") }, async (root) => {
    const initial = build(root);
    assert.equal(initial.status, 0, initial.stdout + initial.stderr);
    await writeNote(root, "two.md", fixture("same"));
    rejected(build(root), /Note path collision:/);
  });
});

test("watchers survive full sync and preserve the accepted collection after rejection", async () => {
  const { createWatcherWrapper } = await import(
    pathToFileURL(join(source, "node_modules/astro/dist/content/watcher.js"))
  );
  const code = stripTypeScriptTypes(await readFile(join(source, "src/note-loader.ts"), "utf8"))
    .replace(
      '"astro/loaders"',
      JSON.stringify(
        pathToFileURL(join(source, "node_modules/astro/dist/content/loaders/glob.js")).href,
      ),
    )
    .replace(
      '"./publication-urls"',
      JSON.stringify(pathToFileURL(join(source, "src/publication-urls.ts")).href),
    );
  const { noteLoader } = await import(
    "data:text/javascript;base64," + Buffer.from(code).toString("base64")
  );
  const root = await mkdtemp(join(tmpdir(), "astromache-note-watcher-"));
  const emitter = new EventEmitter();
  emitter.add = () => {};
  try {
    const directory = join(root, "src/content/notes");
    await mkdir(directory, { recursive: true });
    const file = join(directory, "one.md");
    const duplicate = join(directory, "two.md");
    const extra = join(directory, "extra.md");
    await writeFile(file, JSON.stringify({ slug: "before" }));
    const watcher = createWatcherWrapper(emitter);
    const data = new Map();
    const errors = [];
    const store = {
      get: (id) => data.get(id),
      has: (id) => data.has(id),
      keys: () => [...data.keys()],
      values: () => [...data.values()],
      entries: () => [...data.entries()],
      set: (entry) => {
        data.set(entry.id, entry);
        return true;
      },
      delete: (id) => data.delete(id),
      clear: () => data.clear(),
      addModuleImport: () => {},
    };
    const context = {
      config: { root: pathToFileURL(root + "/"), srcDir: pathToFileURL(join(root, "src/")) },
      collection: "notes",
      store,
      watcher,
      logger: { error: (message) => errors.push(message), warn: () => {}, info: () => {} },
      parseData: async ({ data }) => data,
      generateDigest: (text) => text,
      // Use the installed native glob; isolate the entry parser/store so this
      // test exercises listener lifecycle and atomic validation without a server.
      entryTypes: new Map([
        [
          ".md",
          { getEntryInfo: async ({ contents }) => ({ body: "", data: JSON.parse(contents) }) },
        ],
      ]),
    };
    const waitFor = async (condition) => {
      for (let attempt = 0; attempt < 100 && !condition(); attempt++)
        await new Promise((resolve) => setTimeout(resolve, 10));
      assert.ok(condition(), "Watcher refresh must finish within one second");
    };
    const loader = noteLoader();
    await loader.load(context);
    assert.deepEqual(store.keys(), ["before"]);
    watcher.removeAllTrackedListeners();
    await loader.load(context);
    for (const event of ["add", "change", "unlink"]) assert.equal(emitter.listenerCount(event), 1);
    await writeFile(file, JSON.stringify({ slug: "after" }));
    emitter.emit("change", file);
    await waitFor(() => data.has("after"));
    assert.deepEqual(store.keys(), ["after"]);
    await writeFile(duplicate, JSON.stringify({ slug: "after" }));
    emitter.emit("add", duplicate);
    await waitFor(() => errors.length === 1);
    assert.match(errors[0], /Note path collision:/);
    assert.deepEqual(store.keys(), ["after"]);
    await rm(duplicate);
    emitter.emit("unlink", duplicate);
    await writeFile(file, JSON.stringify({ slug: "recovered" }));
    emitter.emit("change", file);
    await waitFor(() => data.has("recovered"));
    await writeFile(extra, JSON.stringify({ slug: "extra" }));
    emitter.emit("add", extra);
    await waitFor(() => data.has("extra"));
    await rm(extra);
    emitter.emit("unlink", extra);
    await waitFor(() => !data.has("extra"));
    await loader.load(context);
    assert.deepEqual(store.keys(), ["recovered"]);
    for (const event of ["add", "change", "unlink"]) assert.equal(emitter.listenerCount(event), 1);
  } finally {
    emitter.removeAllListeners();
    await rm(root, { recursive: true, force: true });
  }
});
