# AstroMache publication foundation candidate

This working source is an expanded, **unpublished** 0.1.0 candidate. The existing npm astromache@0.1.0 release remains immutable and does not contain these new publication exports. Consumers of this candidate must use its exact local archive and SHA-256 receipt. Do not publish this candidate over the existing version.

The foundation supplies real publication typography, responsive navigation, article presentation, cards, taxonomy lists, theme initialization/toggle, reading progress, focus mode, copy-link feedback, and gallery mechanics. The complete neutral starter and optional search/offline recipe consume these same exports. Content collection schemas, routes, dates, related-content selection, metadata policy, branding, font assets, privacy/share behavior, and search ranking remain consumer-owned.

## Added exports

- `astromache/publication`: document composition; metadata props match `document`; optional htmlAttributes, themeStorageKey (theme), themeToggleId (theme-toggle); head/header/footer/body-end/default slots.
- `astromache/header`: brand, brandHref, links[{label,href,current?}], navigationLabel, itemsId, overlaySelector; menu-icon/close-icon/controls slots. One header per document.
- `astromache/footer`: label; social/default slots.
- `astromache/article`: title, published{datetime,label}, readingTime, lens/tags/related/previous/next links, backHref/backLabel, returnStorageKey, backId/topButtonId; source/actions/reading-tools/back-icon/date-icon/default slots. Consumers derive records; no collection dependency.
- `astromache/post-list`: items[{title,href,description}], headingLevel (2 or 3), optional pagination{current,total,previous,next}, returnStorageKey.
- `astromache/taxonomy-section`: label, href, id, items, itemHeadingLevel (2 or 3).
- `astromache/tag-list`: items[{label,href}], optional class (tag-list).
- `astromache/reading-progress`: wordsPerMinute (200), contentSelector (.post-content), indicatorId (reading-time), barId (myBar).
- `astromache/focus-mode`: toggleId (focus-mode-toggle), storageKey (focus-mode), bodyClass (focus-mode). Custom body classes need consumer styling.
- `astromache/copy-link`: url, text, class, resetMs (2000), copiedText, failedText.
- `astromache/reading-time`: readingTime(text, wordsPerMinute=200), formatReadingTime(minutes).
- `astromache/publication.css`: actual shared publication design; consumer font overrides are --publication-font-sans and --publication-font-mono. Consumers supply brand tokens, font files, and assets.
- `astromache/search.css`: generic search tokens/presentation; consumer Tailwind build directives and source paths remain consumer-owned.

Reading controls and theme/header controllers assume a single publication instance per document. Source exports compile with ordinary Astro 7.3.5 on Node >=24.19.0 <25; no compiler patch or Vite override is required. This candidate adds no dependency, network service, site content, or package publication.

## Published snapshot documentation

The following describes the original published snapshot and its original narrower API. It is retained for release lineage; the candidate additions above are not available from that registry artifact.
# AstroMache

AstroMache is intended to become a reusable publication template product. This 0.1.0 npm candidate supplies its extracted Astro publication machinery; a complete starter is not included yet. Site identity, routes, content, styling, deployment and independently versioned integrations belong to consumers.

`astromache/portfolio` preserves the reusable photography presentation concept: a large-title hero, responsive gallery, image descriptions, and a keyboard-accessible native lightbox. Consumers supply images and their rights. The neutral example uses an original geometric SVG fixture under the owner code license; this package contains no personal photographs. One gallery instance per page is currently supported.

Version 0.1.0 is prepared as the first npm release candidate. It has not been published. The neutral example proves component integration; it is not the complete intended publication starter.

Owner-authored machinery is available under **MIT OR Apache-2.0**, at your option. Dependencies retain their own licenses.

Public templates may opt into `astromache/fonts.css` for unmodified IBM Plex Sans and IBM Plex Mono regular faces. Choose the families in consumer CSS. The package retains IBM's OFL notice and source hashes in `fonts/`; the neutral packed consumer exercises this import. The personal publication's fonts and identity remain consumer-owned.

## Publication and lifecycle contract

`document` accepts required title, description, absolute HTTP(S) canonical URL and BCP47 language, plus optional `htmlAttributes`. It renders `head`, `header`, default/main and `footer` slots. The document supplies semantic markup and skip navigation; consumers own CSS, identity, content, scripts and hosting. The document itself adds no client router, prefetch, tracking or worker.

```astro
---
import Document from "astromache/document";
---
<Document title="Example" description="Consumer-owned publication" canonical={new URL("https://example.com/")} language="en">
  <link slot="head" rel="stylesheet" href="/publication.css" />
  <nav slot="header">Consumer navigation</nav>
  <h1>Consumer content</h1>
  <footer slot="footer">Consumer attribution</footer>
</Document>
```

`portfolio` accepts title, description and an array of source/alt/title/medium/intent items; tools are optional. One gallery per document is supported because the native dialog uses fixed internal IDs. Opening any item replaces all labels/tool chips. Enter, Escape, close button, backdrop and repeated selection preserve native dialog focus return. Broken images retain their alt and an operable close path. Consumer CSS may set `--portfolio-background`, `--portfolio-foreground`, `--portfolio-border` and `--portfolio-focus`; Canvas/CanvasText/currentColor/Highlight are defaults. Styling is standalone CSS with no Tailwind requirement. Multiple galleries are not promised.

## Bounded native navigation policy

`navigation` exports `backgroundDownloadsAllowed(connection?, online = true)` and `installNavigationPrefetch(prefetch, options)`. Consumers inject Astro's native `prefetch` function; the module does not implement a second fetch/cache stack. Options are `maxTargets` (default 6, allowed 0-12), `delayMs` (default 120, allowed 0-2000) and an additional `include(URL)` restriction. Only debounced hover/focus intent triggers same-origin document targets, with per-document deduplication. API/share, query/hash, downloads, file targets and external links are excluded. Static public contact HTML is eligible: native HTML prefetch does not execute its CAPTCHA scripts or submit its form. A consumer may restrict that route with `include`. Offline, Save-Data, 2G/3G, downlink below 1.5Mbps and RTT at least 500ms suppress background requests. Missing connection hints use the bounded normal policy.

Enable native Astro prefetch with `prefetchAll:false`. Call the installer once; it returns a disposer. A consumer with ClientRouter must dispose/reinstall on its navigation lifecycle; static consumers initialize on direct document load. Consumers own worker scope/cache names, route allowlist, static manifest, byte/file budgets, online-only contact and the registration lifecycle. Gate explicit bulk registration with the same connection predicate, but existing browser-managed worker update checks are not fully controllable by application code. No persistent preferences, new storage permission, provider or analytics is introduced.

## Installation and runtime boundary

This source package requires Astro ^7.3.5 and an Astro-compatible TypeScript compiler/bundler. The metadata and navigation entry points ship TypeScript source, not precompiled JavaScript; plain Node consumers need TypeScript loading support. Navigation imports are safe during SSR and installation becomes a no-op without browser globals. Astro components are compiled by the consumer. Only the five documented subpaths are supported; no root export is provided.

See the repository release checklist before proposing a public version.

## Install and supported toolchain

After registry publication, install with `pnpm add astromache@0.1.0 astro@^7.3.5`. Before publication, install the reviewed archive path instead. Node >=24.19.0 <25 is the supported build runtime; Astro 7.3.5 is the qualified peer version. The broader declared Astro ^7.3.5 range is not exhaustively tested. Ordinary Astro compilation does not require this repository's native-TS7 qualification patch or Vite+ override.

Do not import private paths. Preserve the prior archive and lockfile for consumer rollback. Release candidates are identified by commit and archive SHA-256.

