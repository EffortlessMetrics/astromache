# Changelog

## 0.1.0 — unpublished extraction candidate

Shared Workbox corpus generation, integrity-checked versioned cache lifecycle, offline navigation fallback and deferred owned registration. Route/corpus/budget/migration/contact policy remains consumer-owned. No forced activation.

Mandatory API exclusions cover both exact `/api` and `/api/` descendants in corpus generation and runtime navigation fallback. Explicit globs/custom exclusions cannot make the API root cacheable; similarly named ordinary routes remain eligible.
