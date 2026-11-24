import { createHash } from "node:crypto";
import { serializeSearchIndex } from "astromache/search-index";
import { notes, noteLink } from "./publication-content";

let pending: ReturnType<typeof buildSearchIndex> | undefined;
async function buildSearchIndex() {
  const data = (await notes()).map((note) => ({
    title: note.data.title,
    text: note.body ?? "",
    url: noteLink(note.id),
    summary: note.data.description,
    tags: note.data.tags,
    date: note.data.published.toISOString(),
  }));
  // Preserve the existing explicit form's snapshot contract and bind the
  // palette/recovery consumers to the exact serialized response bytes.
  const inner = serializeSearchIndex(data);
  const json = JSON.stringify({ version: inner.version, data });
  return { json, version: createHash("sha256").update(json).digest("hex") };
}
export function searchIndex() {
  return import.meta.env.DEV ? buildSearchIndex() : (pending ??= buildSearchIndex());
}
