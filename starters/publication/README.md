# AstroMache complete neutral publication starter

A standalone neutral publication consuming the actual shared publication foundation: responsive header/theme, article typography, cards, taxonomy, reading progress, focus mode, copy-link feedback, heading anchors and native gallery. Consumer-owned Astro collections contain two original sample articles; routes include posts, article pages, tags, gallery, 404, RSS, robots and sitemap. No private personal corpus, contact backend or deployment settings are included.

Copy this directory independently. Use Node 24.19.x and pnpm 10.28.0; run `pnpm install --frozen-lockfile`, `pnpm qualify`, then `pnpm dev`. Set your site origin and replace sample content, assets and consumer brand/font tokens. The portable publication structure/styles and browser mechanics come from package exports, shared with direct sibling consumers.

This starter pins an **unpublished expanded** astromache 0.1.0 archive, `vendor/astromache-0.1.0-foundation.tgz`, SHA-256 `220ccfd848964fbd7e98893215c973a489e6f71de99b25ad31ba78d9349e45c5`, source `aa372a898f868b5c70cbcb0e8cbd1a7ee2ce5bc5`. The published npm 0.1.0 snapshot is narrower and cannot replace this candidate. No same-version registry replacement is authorized. The original vendored release archive remains historical rollback evidence, not the active dependency.

Owner code/content/sample SVGs are MIT OR Apache-2.0; IBM Plex OFL notices travel in the package. This private starter is not itself an npm package. Vite+ orchestrates ordinary Astro checks/builds, without compiler patches or Vite overrides. The optional sibling recipe adds independently qualified static search and offline behavior.
