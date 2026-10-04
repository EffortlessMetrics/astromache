export interface PublicationMetadata {
  title: string;
  description: string;
  canonical: URL;
  language: string;
}

export function publicationMetadata(input: PublicationMetadata): PublicationMetadata {
  if (!input.title.trim() || !input.description.trim() || !input.language.trim()) {
    throw new Error("Publication metadata requires a title, description and language");
  }
  if (!["http:", "https:"].includes(input.canonical.protocol)) {
    throw new Error("Canonical publication URLs must use HTTP or HTTPS");
  }
  if (input.canonical.username || input.canonical.password || input.canonical.hash) {
    throw new Error("Canonical publication URLs cannot contain credentials or fragments");
  }
  return { ...input, canonical: new URL(input.canonical.href) };
}
