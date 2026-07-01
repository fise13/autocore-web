/**
 * ZIP extraction.
 *
 * Recursively walks an archive (including nested folders), returning every
 * spreadsheet, delimited-text file, and image found inside as {@link SourceFile}s.
 * macOS resource forks (`__MACOSX`, `._*`) and hidden files are ignored.
 */

import JSZip from "jszip";

import { extensionOf, IMAGE_EXTENSIONS, SPREADSHEET_EXTENSIONS, TEXT_TABLE_EXTENSIONS } from "./types";
import type { SourceFile } from "./types";

const KNOWN_EXTENSIONS = new Set<string>([
  ...SPREADSHEET_EXTENSIONS,
  ...TEXT_TABLE_EXTENSIONS,
  ...IMAGE_EXTENSIONS,
]);

function isJunkPath(path: string): boolean {
  const segments = path.split("/");
  const base = segments[segments.length - 1] ?? "";
  return (
    path.startsWith("__MACOSX/") ||
    base.startsWith("._") ||
    base.startsWith(".") ||
    base === "Thumbs.db"
  );
}

export async function extractArchive(bytes: ArrayBuffer): Promise<SourceFile[]> {
  const zip = await JSZip.loadAsync(bytes);
  const files: SourceFile[] = [];

  const entries = Object.values(zip.files).filter(
    (entry) => !entry.dir && !isJunkPath(entry.name),
  );

  for (const entry of entries) {
    const extension = extensionOf(entry.name);
    if (!KNOWN_EXTENSIONS.has(extension)) continue;
    const content = await entry.async("arraybuffer");
    const base = entry.name.split("/").pop() ?? entry.name;
    files.push({ name: base, extension, bytes: content, archivePath: entry.name });
  }

  return files;
}
