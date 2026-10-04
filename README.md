# AstroMache

Small reusable Astro publication machinery. Site identity, routes, content, styling, deployment and independently versioned integrations belong to consumers.

`@effortlessmetrics/astromache/portfolio` preserves the reusable photography presentation concept: a large-title hero, responsive gallery, image descriptions, and a keyboard-accessible native lightbox. Consumers supply images and their rights. The neutral example uses an original geometric SVG fixture under the owner code license; this package contains no personal photographs. One gallery instance per page is currently supported.

Public source does not imply package publication. The package remains private while its boundary and consumer contracts are reviewed.

Owner-authored machinery is available under **MIT OR Apache-2.0**, at your option. Dependencies retain their own licenses.

Public templates may opt into `@effortlessmetrics/astromache/fonts.css` for unmodified IBM Plex Sans and IBM Plex Mono regular faces. Choose the families in consumer CSS. The package retains IBM's OFL notice and source hashes in `fonts/`; the neutral packed consumer exercises this import. The personal publication's fonts and identity remain consumer-owned.

## Publication and lifecycle contract

`document` accepts required title, description, absolute HTTP(S) canonical URL and BCP47 language, plus optional `htmlAttributes`. It renders `head`, `header`, default/main and `footer` slots. The document supplies semantic markup and skip navigation; consumers own CSS, identity, content, scripts and hosting. The document itself adds no client router, prefetch, tracking or worker.

```astro
---
import Document from "@effortlessmetrics/astromache/document";
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
