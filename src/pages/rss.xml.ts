import type { APIContext } from "astro";
import { notes, noteLink } from "../publication-content";
import { canonicalURL, xml } from "../publication-urls";
export async function GET({ site }: APIContext) {
  const entries = await notes();
  return new Response(
    '<?xml version="1.0" encoding="UTF-8"?><rss version="2.0"><channel><title>Field Notes</title><link>' +
      xml(canonicalURL("/", site).href) +
      "</link><description>Careful observations and practical experiments.</description>" +
      entries
        .map(
          (note) =>
            "<item><title>" +
            xml(note.data.title) +
            "</title><link>" +
            xml(canonicalURL(noteLink(note.id), site).href) +
            "</link><guid>" +
            xml(canonicalURL(noteLink(note.id), site).href) +
            "</guid><description>" +
            xml(note.data.description) +
            "</description><pubDate>" +
            note.data.published.toUTCString() +
            "</pubDate></item>",
        )
        .join("") +
      "</channel></rss>",
    { headers: { "Content-Type": "application/rss+xml; charset=utf-8" } },
  );
}
