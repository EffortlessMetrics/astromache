# Release candidate procedure

The next archive is prepared for npm review. Preparation and dry-run checks do not authorize registry publication.

## Supported contract

Five exported subpaths: document, metadata, navigation, fonts.css and portfolio. Astro components and TypeScript modules remain source for the consumer compiler/bundler. No root export or precompiled JavaScript entry is promised. Astro ^7.3.5 is the peer range; exact 7.3.5 is qualified. Node 24.19.x is the qualified build runtime. Consumers own site identity, routes, styling, content, deployment, search, contact and workers. One gallery per page is supported.

## Immutable candidate

1. Run pnpm qualify and pnpm verify:packed on the final source. Inspect the exact archive file allowlist, license texts, font source hashes and shipped README/API agreement.
2. Record commit, archive filename, SHA-256 and npm dry-run inventory. Preserve the reviewed archive; do not repack after acceptance or publish different bytes under that version.
3. Execute npm publish <absolute-reviewed-tarball> --dry-run --access public --ignore-scripts. This checks package inventory locally; it does not publish or prove registry credentials.
4. Registry publication requires a separate explicit authorization. The corresponding release command is npm publish <absolute-reviewed-tarball> --access public --ignore-scripts. Run it only for the exact accepted archive after that authorization. No automatic publication workflow exists.

## Version and consumer lifecycle

Before 1.0, breaking public exports, props, behavior or peer requirements require a minor version and conspicuous breaking notes. Compatible additions/fixes use a patch version. A future 1.0 adopts ordinary semantic versioning. No stability promise is inferred for unexported paths or unqualified toolchains.

Each consumer upgrade records old/new commit and archive hashes, relevant interface changes and local acceptance. Preserve the old archive and lockfile. Restore those exact pins with frozen installation and repeat affected checks to demonstrate rollback. Production rollback remains the consumer's separate operation.

The independent starters/publication project supplies a complete neutral publication with article/index/taxonomy routes, responsive shared typography/theme/navigation/reading mechanics, gallery, 404, RSS, robots and sitemap. recipes/search-offline adds optional static search and offline reading by consuming sibling packages directly. Real sites remain direct sibling package consumers. The expanded unpublished candidate exports generic publication presentation and reading mechanics; feed generation, content schemas, branding and metadata policies remain consumer-owned. Universal publication diagnostics are not an implemented export.
