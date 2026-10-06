# AstroMache publication starter

A small neutral publication with a home article, gallery, keyboard-accessible native lightbox, navigation and optional IBM Plex fonts. This is the initial starter product; it does not include a complete personal corpus, search, offline worker, contact integration or deployment configuration.

Copy this directory as an independent project. Use Node 24.19.x and pnpm 10.28.0, then run pnpm install --frozen-lockfile, pnpm qualify and pnpm dev. Set the site URL in astro.config.mjs, replace sample content/images and adapt consumer-owned CSS. Owner code/sample SVG is MIT OR Apache-2.0; font OFL notices travel inside the package archive.

This starter is a sibling consumer of @effortlessmetrics/astromache 0.1.0. Other publications may consume the package directly; they do not depend on this starter. The vendored release-candidate archive permits independent installation before npm publication. Archive SHA-256: e6d592439be61a902f910dc91e2296d3a542897e17ecde6d2462fa20baf23172. No registry publication is implied.

After publication, an owner may replace the file dependency with exact registry version 0.1.0 and update/qualify the lockfile. Preserve the archive and lockfile for rollback. This project is private and is not itself an npm package. Vite+ orchestrates ordinary Astro check/build tasks; no native-TS7 qualification patch or framework override is required.
