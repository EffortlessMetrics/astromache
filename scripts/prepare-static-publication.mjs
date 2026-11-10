import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { readFile, writeFile, copyFile, mkdir, readdir } from "node:fs/promises";
import { resolve, join } from "node:path";
import { createHash } from "node:crypto";
const source = resolve(process.argv[2]);
const expectedCommit = "0b89706a6198f53e0e6e040d4a87d9dec8cc0145";
const expectedHash = "cb0bd7bf6cd379237a267fe42a0af512c566bae1d56535c3a019ba7227948d0b";
const version = "0.3.0-publishing.1";
const run = (command, args, cwd = process.cwd()) => execFileSync(command, args, { cwd, stdio: "inherit" });
assert.equal(execFileSync("git", ["rev-parse", "HEAD"], { cwd: source, encoding: "utf8" }).trim(), expectedCommit);
const work = resolve(".publication-preparation");
await mkdir(work, { recursive: true });
run("pnpm", ["pack", "--pack-destination", work], join(source, "packages/astromache"));
const name = `astromache-${version}.tgz`;
assert.ok((await readdir(work)).includes(name));
const bytes = await readFile(join(work, name));
assert.equal(createHash("sha256").update(bytes).digest("hex"), expectedHash, "Core archive must match the real installed-consumer receipt");
await copyFile(join(work, name), `vendor/${name}`);
const manifest = JSON.parse(await readFile("package.json", "utf8"));
manifest.dependencies.astromache = `file:vendor/${name}`;
manifest.scripts["verify:publication"] = "node scripts/verify-static-publication.mjs";
await writeFile("package.json", JSON.stringify(manifest, null, 2) + "\n");
const delivery = JSON.parse(await readFile("STARTER-DELIVERY.json", "utf8"));
delivery.previousStaticPublicationDelivery = { archive: delivery.archives.astromache, sourceCommit: delivery.sourceCommits["astromache-core"] };
delivery.archives.astromache = { file: `vendor/${name}`, version, sha256: expectedHash };
delivery.sourceCommits["astromache-core"] = expectedCommit;
delivery.staticPublication = { sourceCommit: expectedCommit, coreQualificationRun: 42754582053, starterQualification: "PENDING; historical acceptance fields below retain their original scope", markdown: true, workerRequired: false };
await writeFile("STARTER-DELIVERY.json", JSON.stringify(delivery, null, 2) + "\n");
const artifacts = JSON.parse(await readFile("candidate-artifacts.json", "utf8"));
artifacts.astromache = { version, sha256: expectedHash, repository: "EffortlessMetrics/astromache-core", sourceCommit: expectedCommit, scope: "Unpublished static publication candidate; starter qualification pending", previous: artifacts.astromache };
await writeFile("candidate-artifacts.json", JSON.stringify(artifacts, null, 2) + "\n");
const config = await readFile("site.config.mjs", "utf8");
assert.ok(!config.includes("publicationPolicy"));
await writeFile("site.config.mjs", config + '\n// One switch controls generated Markdown and its advertised alternatives.\nexport const publicationPolicy = { markdown: true };\n');
await writeFile("astro.config.mjs", `import { defineConfig } from "astro/config";
import astroOffline from "astromache/static-offline";
import staticPublication from "astromache/static-publication";
import { origin, offlinePolicy, publicationPolicy } from "./site.config.mjs";
export default defineConfig({
  site: origin,
  prefetch: { prefetchAll: false },
  integrations: [
    staticPublication({
      origin,
      markdown: publicationPolicy.markdown,
      sitemap: "sitemap-index.xml",
      feed: "rss.xml",
      searchIndex: "search-index.json",
      renderedSearch: true,
    }),
    astroOffline(offlinePolicy),
  ],
});\n`);
let layout = await readFile("src/layouts/Publication.astro", "utf8");
layout = layout.replace("import {canonicalURL} from '../publication-urls';", "import {canonicalURL} from '../publication-urls';\nimport PublicationHead from 'astromache/publication-head';\nimport {publicationPolicy} from '../../site.config.mjs';");
layout = layout.replace("interface Props {title:string;description:string;article?:boolean;}", "interface Props {title:string;description:string;article?:boolean;published?:Date;}");
layout = layout.replace("const {title,description,article=false}=Astro.props;", "const {title,description,article=false,published}=Astro.props;\nconst mainOutput=Astro.url.pathname==='/'||Astro.url.pathname==='/posts/'||Astro.url.pathname.startsWith('/tags/');\nconst markdown=publicationPolicy.markdown&&(article||mainOutput);");
const oldHead = '<meta property="og:type" content={article?\'article\':\'website\'}/><meta property="og:title" content={title}/><meta property="og:description" content={description}/><meta property="og:url" content={canonical.href}/>';
assert.ok(layout.includes(oldHead));
layout = layout.replace(oldHead, '<PublicationHead {title} {description} {canonical} {published} type={article?\'article\':\'website\'} {markdown} body={article?\'marked\':\'main\'}/>');
await writeFile("src/layouts/Publication.astro", layout);
const notePath = "src/pages/notes/[...slug].astro";
let note = await readFile(notePath, "utf8");
assert.ok(note.includes('description={note.data.description} article>'));
note = note.replace('description={note.data.description} article>', 'description={note.data.description} article published={note.data.published}>').replace('<p slot="source" class="source-attribution">', '<p slot="source" class="source-attribution" data-publication-source>');
await writeFile(notePath, note);
let headers = await readFile("public/_headers", "utf8");
headers += '\n# Static alternate representations need no Function or Worker.\n/_markdown/*\n  Content-Type: text/markdown; charset=utf-8\n  X-Content-Type-Options: nosniff\n';
await writeFile("public/_headers", headers);
let readme = await readFile("README.md", "utf8");
readme = readme.replace("unpublished astromache 0.2.7 core preset", "unpublished astromache 0.3.0-publishing.1 core preset");
readme += `\n## Native static publication output\n\n\`publicationPolicy.markdown\` in \`site.config.mjs\` controls both generated Markdown and alternate links. Articles use their rendered public body; the homepage, Posts and taxonomy pages use their main content. Search, gallery and recovery pages remain HTML-only. The existing draft/future selector applies to every public route.\n\nThe shared core emits \`/_markdown/… .md\` (without the space), validates sitemap/RSS/search references, and replaces search text with the rendered article text before offline hashing. It does not publish raw source comments or frontmatter. The original HTML bytes are unchanged. \`public/_headers\` supplies the Markdown MIME type on compatible static hosts.\n\nSet the switch to \`false\` and rebuild to remove Markdown and its discovery links together. No Worker, Function, paid Cloudflare plan or account-level setting is required. Same-URL Accept negotiation is not enabled by this starter. The static HTML remains the baseline, and the original offline byte/resource budgets and activation policy remain unchanged. Markdown is network-only under this starter's unchanged precache globs.\n\nSupply public source attribution using \`data-publication-source\` and exclude only non-publication UI using \`data-publication-exclude\`. Rich media requiring a textual representation must use a faithful \`data-publication-text\` alternative. The core's \`STATIC-PUBLICATION.md\` documents supported formats, failure behavior and custom content adapters. Do not rely on CSS classes to hide private material.\n\nRun \`pnpm verify:publication\` after building. Its real-build controls verify static output, actual HTML hashes and rendered search, then exercise the single disabled setting and restore the enabled build. The existing serialization suite retains draft/future/clean-rebuild and URL fixtures. This candidate is not a registry release or production deployment.\n`;
readme = readme.replace('`/_markdown/… .md` (without the space)', '`/_markdown/<canonical-path>.md`');
await writeFile("README.md", readme);
run("pnpm", ["install", "--ignore-scripts", "--no-frozen-lockfile"]);
run("pnpm", ["install", "--ignore-scripts", "--frozen-lockfile"]);
run("pnpm", ["exec", "vp", "fmt", "README.md", "package.json", "STARTER-DELIVERY.json", "candidate-artifacts.json", "site.config.mjs", "astro.config.mjs", "src/layouts/Publication.astro", notePath, "scripts/verify-static-publication.mjs"]);
