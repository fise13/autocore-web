/**
 * Cache identity for a thumbnail handed to a SwiftUI `Image`.
 *
 * SwiftUI's `Image` takes an SF Symbol, an asset-catalogue name, or a **local
 * file** — there is no remote-URL variant and no `AsyncImage` in `@expo/ui`.
 * So every photo shown in a native row has to exist as a file on disk first,
 * and `uiImage` reads that file **synchronously on the main thread**. Handing
 * it the original is not an option: intake photos are full-resolution camera
 * JPEGs, and decoding one of those per row while a list scrolls would stall the
 * UI thread outright.
 *
 * Hence a separate, deliberately tiny derivative per (url, size), keyed here.
 * The key has to be stable across launches — the whole point is that the second
 * launch finds the file already there — and safe as a filename.
 *
 * Pure — no React Native — so the node test runner can load it.
 */

/**
 * FNV-1a, 32-bit.
 *
 * Chosen over a crypto hash because this module must stay dependency-free and
 * loadable under the plain node test runner; collision resistance is worth
 * nothing here, since a collision would only mean showing the wrong cached
 * thumbnail for two URLs that also share a length and a size bucket.
 */
function fnv1a(input: string): string {
  let hash = 0x811c9dc5;
  for (let index = 0; index < input.length; index += 1) {
    hash ^= input.charCodeAt(index);
    // `Math.imul` keeps the multiply in 32-bit space; `*` would lose precision
    // past 2^53 and quietly stop distributing.
    hash = Math.imul(hash, 0x01000193);
  }
  return (hash >>> 0).toString(36);
}

/**
 * Pixel width the derivative is generated at.
 *
 * Rounded up to a small set of buckets so a 56pt row and a 58pt row share one
 * file rather than doubling the cache, and multiplied for Retina — a thumbnail
 * generated at logical size looks soft on every device this app ships to.
 */
export function thumbPixelWidth(pointSize: number, scale = 3): number {
  const raw = Math.max(1, Math.round(pointSize)) * scale;
  const bucket = 64;
  return Math.min(1024, Math.ceil(raw / bucket) * bucket);
}

/** Filename (no directory, no extension) for a URL rendered at a point size. */
export function thumbCacheKey(url: string, pointSize: number): string {
  const width = thumbPixelWidth(pointSize);
  // Length is folded in as a cheap second dimension: two URLs that collide in
  // the hash almost never also share a length.
  return `${fnv1a(url)}-${url.length.toString(36)}-${width}`;
}
