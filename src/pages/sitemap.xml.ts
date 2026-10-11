import type { APIContext } from "astro";
import { notes, noteLink, taxonomyRoutes } from "../publication-content";
import { canonicalURL, xml } from "../publication-urls";
export async function GET({ site }: APIContext) {
  const entries = await notes();
  const paths = [
    "/",
    "/posts/",
    "/portfolio/",
    "/search/",
    ...entries.map((note) => noteLink(note.id)),
    ...taxonomyRoutes(entries).map(({ params }) => "/tags/" + params.tag + "/"),
  ];
  return new Response(
    '<?xml version="1.0" encoding="UTF-8"?><urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">' +
      paths
        .map((href) => "<url><loc>" + xml(canonicalURL(href, site).href) + "</loc></url>")
        .join("") +
      "</urlset>",
    { headers: { "Content-Type": "application/xml; charset=utf-8" } },
  );
}
