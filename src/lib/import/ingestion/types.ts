/**
 * Ingestion layer types.
 *
 * Ingestion is the engine's "senses": it turns an arbitrary upload (.xlsx, .xls,
 * .csv, or a .zip of any of those plus photos) into clean {@link ParsedTable}s
 * and a list of {@link ImageAsset}s. It is transport-agnostic — it accepts raw
 * bytes, so the same code runs in the browser, a Web Worker, or on the server.
 */

import type { ParsedTable } from "../types";

/** A raw input file, already read into memory. */
export type SourceFile = {
  name: string;
  /** Lowercased extension without dot ("xlsx", "csv", "zip", "jpg"…). */
  extension: string;
  bytes: ArrayBuffer;
  /** Path inside an archive, when extracted from a ZIP. */
  archivePath?: string;
};

/** An image discovered alongside the data (in a ZIP or referenced by URL). */
export type ImageAsset = {
  /** File name without directory. */
  fileName: string;
  /** Full path inside the archive (for nested folders). */
  path: string;
  bytes: ArrayBuffer;
  mimeType: string;
  /** Normalized stem used for matching ("c123456" from "C123456.jpg"). */
  matchKey: string;
};

export type IngestResult = {
  tables: ParsedTable[];
  images: ImageAsset[];
  /** Files we could not parse, with a reason. */
  skipped: Array<{ name: string; reason: string }>;
  warnings: string[];
};

export const SPREADSHEET_EXTENSIONS = new Set(["xlsx", "xls", "xlsm", "xlsb"]);
export const TEXT_TABLE_EXTENSIONS = new Set(["csv", "tsv", "txt"]);
export const IMAGE_EXTENSIONS = new Set([
  "jpg",
  "jpeg",
  "png",
  "webp",
  "gif",
  "heic",
  "bmp",
  "tif",
  "tiff",
]);

export const IMAGE_MIME_BY_EXT: Record<string, string> = {
  jpg: "image/jpeg",
  jpeg: "image/jpeg",
  png: "image/png",
  webp: "image/webp",
  gif: "image/gif",
  heic: "image/heic",
  bmp: "image/bmp",
  tif: "image/tiff",
  tiff: "image/tiff",
};

export function extensionOf(name: string): string {
  const dot = name.lastIndexOf(".");
  return dot >= 0 ? name.slice(dot + 1).toLowerCase() : "";
}
