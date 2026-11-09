// One cutoff keeps every route in a build on the same publication boundary.
// Static scheduled content becomes available only after a subsequent rebuild.
const publicationTime = Date.now();

/** @param {{ draft?: boolean, published: Date }} data */
export function isPublished(data, now = publicationTime) {
  return data.draft !== true && data.published.getTime() <= now;
}
