import { defineConfig } from "astro/config";
import astroOffline from "astromache/static-offline";
import tailwindcss from "@tailwindcss/vite";
import { origin, offlinePolicy } from "./site.config.mjs";
export default defineConfig({
  site: origin,
  prefetch: { prefetchAll: false },
  vite: { plugins: [tailwindcss()] },
  integrations: [astroOffline(offlinePolicy)],
});
