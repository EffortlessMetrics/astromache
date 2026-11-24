import { createStaticIndexLoader, createStaticSearchBackend } from "@effortlessmetrics/static-search";
import { versionedSearchIndexPath } from "astromache/search-index-path";
import {
  getSearchMatchTerms,
  rankSearchCandidates,
  type SearchAnswer,
  type SearchExecutionOptions,
  type SearchResultItem,
} from "type-anywhere-search";

interface SearchDocument extends SearchResultItem {
  body: string;
}
interface NoteRow {
  title: string;
  text: string;
  url: string;
  summary: string;
  tags: string[];
  date: string;
}
function validNote(row: unknown): row is NoteRow {
  if (row === null || typeof row !== "object") return false;
  const note = row as Partial<NoteRow>;
  return (
    typeof note.title === "string" &&
    typeof note.text === "string" &&
    typeof note.url === "string" &&
    note.url.startsWith("/notes/") &&
    !note.url.includes("\\") &&
    new URL(note.url, "https://notes.invalid").origin === "https://notes.invalid" &&
    typeof note.summary === "string" &&
    Array.isArray(note.tags) &&
    note.tags.every((tag) => typeof tag === "string") &&
    typeof note.date === "string" &&
    Number.isFinite(Date.parse(note.date))
  );
}
export function createNoteSearch(expectedVersion: string | undefined) {
  const index = createStaticIndexLoader<SearchDocument[]>({
    expectedVersion,
    async load(signal) {
      if (!expectedVersion) throw new Error("Missing search index binding");
      const response = await fetch(versionedSearchIndexPath("/search-index", expectedVersion), {
        signal,
      });
      if (!response.ok) throw new Error("Index unavailable");
      const bytes = await response.arrayBuffer();
      const digest = await crypto.subtle.digest("SHA-256", bytes);
      const version = Array.from(new Uint8Array(digest), (value) =>
        value.toString(16).padStart(2, "0"),
      ).join("");
      const snapshot = JSON.parse(new TextDecoder().decode(bytes));
      if (!Array.isArray(snapshot.data) || !snapshot.data.every(validNote)) {
        throw new Error("Invalid search index");
      }
      const data: SearchDocument[] = (snapshot.data as NoteRow[]).map((note) => ({
        id: note.url,
        slug: note.url,
        title: note.title,
        summary: note.summary,
        tags: note.tags,
        date: note.date,
        body: note.text,
        bodyPreview: note.summary,
      }));
      return { version, data };
    },
  });
  return createStaticSearchBackend<
    SearchDocument[],
    SearchExecutionOptions,
    SearchAnswer,
    SearchDocument
  >({
    index,
    createFallback: (snapshot) => ({
      search(query, options) {
        const candidates = snapshot.data.filter((doc) => {
          const date = new Date(doc.date!);
          return (
            options.tags.every((tag) => doc.tags.includes(tag)) &&
            (!options.dateRange?.start || date >= options.dateRange.start) &&
            (!options.dateRange?.end || date <= options.dateRange.end)
          );
        });
        const results = rankSearchCandidates(query, candidates)
          .slice(0, options.limit)
          .map((doc) => ({ ...doc, matchedTerms: getSearchMatchTerms(query, doc) }));
        return { results };
      },
    }),
    getAllDocuments: (snapshot) => snapshot.data,
  });
}
