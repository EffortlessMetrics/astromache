import { origin } from "../site.config.mjs";

// Assign the pathname so note IDs containing ? or # remain path segments.
// The URL serializer matches the canonical URLs in emitted HTML.
export const canonicalURL = (pathname: string, site?: URL) => {
  const url = new URL(site?.origin ?? origin);
  url.pathname = pathname;
  return url;
};

export const noteLink = (id: string) => {
  const segments = id.split("/");
  if (
    segments.some((segment) => !segment || segment === "." || segment === "..") ||
    // eslint-disable-next-line no-control-regex -- Note routes must reject C0 controls and DEL.
    /[\\\u0000-\u001f\u007f]/.test(id)
  ) {
    throw new Error(
      `Invalid note ID ${JSON.stringify(id)}: use nonempty path segments without dot segments, backslashes or control characters.`,
    );
  }
  // Astro decodes percent escapes before matching getStaticPaths. Reject them
  // rather than publishing a URL for the wrong entry or failing in prerendering.
  if (id.includes("%")) {
    throw new Error(
      `Unsupported note ID ${JSON.stringify(id)}: percent signs are not supported by Astro note routes. Use the decoded slug.`,
    );
  }
  // Astro normalizes route parameters to NFC before generating static paths.
  return canonicalURL("/notes/" + id.normalize() + "/").pathname;
};

export const xml = (text: string) =>
  text.replace(
    /[<>&"']/g,
    (ch) => ({ "<": "&lt;", ">": "&gt;", "&": "&amp;", '"': "&quot;", "'": "&apos;" })[ch]!,
  );
