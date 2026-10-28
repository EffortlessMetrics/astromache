// ISO timestamps without an offset are interpreted as UTC, consistently with
// date-only frontmatter and the UTC date displayed by the starter.
export function normalizePublished(value) {
  if (
    typeof value === "string" &&
    /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}(?::\d{2}(?:\.\d+)?)?$/.test(value)
  ) {
    return `${value}Z`;
  }
  return value;
}
