import { gunzipSync, gzipSync } from "node:zlib";

/**
 * How a plan is carried into storage, and back out.
 *
 * The plan used to go into the job document as one `planJson` string. That
 * works right up until someone imports a real book: a sheet with a few
 * thousand rows produces a plan carrying a decision, a reason sentence and the
 * original text for every value, and Firestore refuses any document over
 * 1,048,576 bytes. The import then failed at the last step of understanding
 * the file — after all the work, with nothing to show for it.
 *
 * So a plan is compressed and split. Compression is not decoration here: the
 * plan is JSON with the same reason sentences repeated thousands of times, and
 * it shrinks by an order of magnitude, which is the difference between a
 * handful of documents and a hundred. Splitting is what removes the ceiling
 * altogether — the size a file may have is now a property of nothing.
 *
 * Pure: no Firestore, no network. The persistence side lives in
 * `import-job.server.ts`.
 */

/** Marks how the chunks were encoded, so a reader never has to guess. */
export const PLAN_FORMAT_GZIP_BASE64 = "gzip-base64";

/** Legacy documents wrote the plan uncompressed into a single field. */
export const PLAN_FORMAT_JSON = "json";

export type PlanFormat = typeof PLAN_FORMAT_GZIP_BASE64 | typeof PLAN_FORMAT_JSON;

/**
 * Characters per chunk.
 *
 * Firestore's limit is 1,048,576 bytes for the whole document, including field
 * names, the document name and every other field on it. Base64 is ASCII, so
 * characters are bytes, and 700k leaves room for the chunk's own metadata with
 * a wide margin rather than a calculated one — being wrong here costs a failed
 * import, and being generous costs one extra document per 700KB.
 */
export const MAX_PLAN_CHUNK_CHARS = 700_000;

/** Zero-padded so ids sort in sequence and reads need no query or index. */
export function planChunkId(sequence: number): string {
  return `chunk-${String(sequence).padStart(5, "0")}`;
}

/**
 * Serialize a plan into storable chunks.
 *
 * Returns at least one chunk, always: an empty list would be indistinguishable
 * from "no plan stored" on the way back in.
 */
export function encodePlan(plan: unknown, maxChars: number = MAX_PLAN_CHUNK_CHARS): string[] {
  const json = JSON.stringify(plan);
  const packed = gzipSync(Buffer.from(json, "utf8"), { level: 9 }).toString("base64");
  return splitByLength(packed, maxChars);
}

/**
 * Rebuild the plan JSON from what was stored.
 *
 * Throws rather than returning a half-plan: a missing chunk means the text is
 * truncated JSON, and the only honest answer is that the plan could not be
 * read. Committing a partially decoded plan would write a partial import while
 * reporting success.
 */
export function decodePlan(chunks: string[], format: PlanFormat): string {
  const joined = chunks.join("");
  if (!joined) throw new Error("Import plan is empty");
  if (format === PLAN_FORMAT_JSON) return joined;
  return gunzipSync(Buffer.from(joined, "base64")).toString("utf8");
}

/**
 * Split on character count.
 *
 * Base64 output is ASCII, so a character boundary is a byte boundary and there
 * is no multi-byte sequence to cut in half. Chunks are concatenated before
 * decoding, so where the cuts fall does not matter.
 */
function splitByLength(value: string, maxChars: number): string[] {
  const size = Math.max(1, Math.floor(maxChars));
  if (value.length <= size) return [value];
  const chunks: string[] = [];
  for (let start = 0; start < value.length; start += size) {
    chunks.push(value.slice(start, start + size));
  }
  return chunks;
}
