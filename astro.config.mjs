import { defineConfig } from "astro/config";
import astroOffline from "astromache/static-offline";
import { origin, offlinePolicy } from "./site.config.mjs";
export default defineConfig({
  site: origin,
  prefetch: { prefetchAll: false },
  integrations: [astroOffline(offlinePolicy)],
});
