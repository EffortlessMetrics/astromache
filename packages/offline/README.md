# @effortlessmetrics/astro-offline

Unpublished 0.1.0 candidate: reusable Workbox7.4.1 static Astro corpus builds and browser registration. No deployment or registry publication is implied.

Import astroOffline (default) or generateOfflineWorker(directory, policy) from /integration. Import installOfflineRegistration(options) and backgroundDownloadsAllowed from /client. These are separate Node build and browser/SSR-safe entry points; no Node/Workbox build dependencies are imported by the client entry.

Consumers own cache prefixes, clean page allowlists, static asset globs, byte/resource/file/HTML budgets, worker URL/scope, query matching, fallback route/timeout, legacy exact cache names and scope restrictions. They retain contact validation/submission and site identity. API paths are excluded by default; external resources, runtime cache growth, POSTs and queues are not supported. Contact HTML may be part of a corpus without executing CAPTCHA or submitting it.

The generator uses Workbox getManifest and a bundled local PrecacheController. Build revision covers policy, worker implementation and every selected byte. Installation checks SHA-256 for each fetched resource, uses no credentials/redirects, rejects mixed or incomplete builds and deletes only the failed new cache. Cache naming is consumerPrefix+revision; Workbox cache keys have revision queries. New workers wait naturally; no skipWaiting, forced reload or update message capability exists. Optional claimClients preserves a consumer's existing control of open pages after natural activation; it runs only in the activate event and cannot activate a waiting worker. Business leaves it false; personal retains its established behavior. Activation removes only older owned-prefix caches and explicitly listed legacy caches under the configured scope guard.

Registration waits for load, checks online/SaveData/slow2G2G3G/downlink<1.5Mbps/RTT>=500ms, optionally visibility and canRegister, and retries on online/visibility/connection changes. Optional idle scheduling, same-worker reuse and foreign-worker refusal preserve different consumer policies. It returns a disposer. Registration errors allow later retry; onState exposes state/error without requiring console or UI copy.

Qualified Node24.19.x and Astro7.3.5. Source package owner code is MIT OR Apache-2.0. Workbox and esbuild remain dependencies under their own licenses; no vendor CDN worker imports are emitted. Scope/policy changes require consumer qualification and exact previous archive/lock retention for rollback. A successfully installed corpus is required for offline support; no live delivery or production acceptance is claimed.

Generated workers retain the complete pinned Workbox MIT copyright and permission notice. WORKBOX-LICENSE matches all three runtime modules' license SHA-256 aee9670e09b75ca8a2a1fe62d545ae38a6797970caf0335628e3a4dd15bc9b6c. The notice and actual bundled runtime bytes participate in corpus revision identity.

Generated workers also retain the complete owner-code MIT alternative notice, preserving Steven Zimmerman attribution and permission terms. Both complete notices are hashed into worker revision identity.
