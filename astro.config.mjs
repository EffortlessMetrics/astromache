import { defineConfig } from "astro/config";
import astroOffline from "astromache/static-offline";
import staticPublication from "astromache/static-publication";
import { origin, offlinePolicy, publicationPolicy } from "./site.config.mjs";
export default defineConfig({
  site: origin,
  prefetch: { prefetchAll: false },
  integrations: [
    staticPublication({
      origin,
      markdown: publicationPolicy.markdown,
      sitemap: "sitemap-index.xml",
      feed: "rss.xml",
      searchIndex: "search-index.json",
      renderedSearch: true,
    }),
    astroOffline(offlinePolicy),
  ],
});
