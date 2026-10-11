import type { APIContext } from "astro";
import { canonicalURL, xml } from "../publication-urls";
export function GET({ site }: APIContext) {
  return new Response(
    '<?xml version="1.0" encoding="UTF-8"?><sitemapindex xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"><sitemap><loc>' +
      xml(canonicalURL("/sitemap.xml", site).href) +
      "</loc></sitemap></sitemapindex>",
    { headers: { "Content-Type": "application/xml; charset=utf-8" } },
  );
}
