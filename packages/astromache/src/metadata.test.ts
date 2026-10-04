import { expect, test } from "vite-plus/test";
import { publicationMetadata } from "./metadata.js";

const base = {
  title: "A publication",
  description: "An independent consumer",
  language: "en",
  canonical: new URL("https://example.test/article/"),
};

test.each([
  "javascript:alert(1)",
  "file:///article",
  "https://user:secret@example.test/",
  "https://example.test/#fragment",
])("rejects an unsafe or noncanonical document URL: %s", (canonical) => {
  expect(() => publicationMetadata({ ...base, canonical: new URL(canonical) })).toThrow();
});

test("metadata is isolated from later caller URL mutations", () => {
  const input = { ...base, canonical: new URL(base.canonical) };
  const output = publicationMetadata(input);
  input.canonical.pathname = "/changed/";
  expect(output.canonical.href).toBe("https://example.test/article/");
});

test.each(["title", "description", "language"] as const)("rejects missing %s", (key) => {
  expect(() => publicationMetadata({ ...base, [key]: " " })).toThrow();
});
