# Search and offline publication recipe

An optional standalone sibling to the complete starters/publication project. It consumes astromache 0.1.0, @effortlessmetrics/static-search 0.1.0 and @effortlessmetrics/astro-offline 0.1.0 directly from exact vendored candidate archives. It is private, not an npm package and does not change either real site's dependency on the starter.

Use Node 24.19.x / pnpm 10.28.0. Copy this directory independently, run pnpm install --frozen-lockfile and pnpm qualify, then pnpm dev. Set your site URL and replace the sample notes/gallery. Search corpus schema, substring matching, results and routes are local recipe policy; the static-search package owns loader/backend lifecycle. The corpus version is a SHA-256 of serialized notes. No MiniSearch or worker engine is implied.

Offline policy explicitly covers this small static output: 100 resources / 5 MiB, each file 2 MiB, HTML 256 KiB, owned cache prefix, API exclusion and local offline navigation fallback. Registration is deferred by connection/visibility, refuses a foreign worker and naturally waits for old tabs. No forced activation, reload, contact queue or full personal corpus is present. First installation becomes controlling on a later navigation/reload.

The complete foundation starter remains available separately. Owner code and SVGs are MIT OR Apache-2.0; fonts preserve OFL notices in astromache; emitted offline workers retain the complete owner-code MIT alternative and Workbox MIT notices. The expanded AstroMache, static-search and offline archives are unpublished candidates; the existing narrower npm astromache 0.1.0 remains immutable. Publication/deployment require separate authorization.

Expanded foundation archive SHA-256: 220ccfd848964fbd7e98893215c973a489e6f71de99b25ad31ba78d9349e45c5; package source: aa372a898f868b5c70cbcb0e8cbd1a7ee2ce5bc5. This same-version candidate cannot be substituted with the existing registry snapshot. Both neutral products consume the same publication components and portable styles; collection schemas, routes, sample content and search engine remain consumer-owned.
