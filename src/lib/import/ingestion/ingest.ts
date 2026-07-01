/**
 * Ingestion orchestrator.
 *
 * One entry point — `ingestFiles` — turns any combination of uploads into a
 * normalized {@link IngestResult}: clean tables ready for {@link analyzeTable}
 * plus every image found (for photo matching). ZIPs are expanded recursively.
 */

import { fold } from "@/lib/domain/normalize";

import { extractArchive } from "./extract-archive";
import { parseDelimitedText, parseWorkbook } from "./parse-tables";
import {
  extensionOf,
  IMAGE_EXTENSIONS,
  IMAGE_MIME_BY_EXT,
  SPREADSHEET_EXTENSIONS,
  TEXT_TABLE_EXTENSIONS,
  type ImageAsset,
  type IngestResult,
  type SourceFile,
} from "./types";

/** Browser File / Blob-like input, kept structural to avoid DOM typing on server. */
export type IngestInput = {
  name: string;
  arrayBuffer: () => Promise<ArrayBuffer>;
};

/** Strip the extension and fold a filename into a stable match key. */
export function imageMatchKey(fileName: string): string {
  const dot = fileName.lastIndexOf(".");
  const stem = dot >= 0 ? fileName.slice(0, dot) : fileName;
  return fold(stem);
}

function toImageAsset(file: SourceFile): ImageAsset {
  return {
    fileName: file.name,
    path: file.archivePath ?? file.name,
    bytes: file.bytes,
    mimeType: IMAGE_MIME_BY_EXT[file.extension] ?? "application/octet-stream",
    matchKey: imageMatchKey(file.name),
  };
}

/** Expand archives, leave everything else untouched. */
async function flattenSources(file: SourceFile): Promise<SourceFile[]> {
  if (file.extension === "zip") {
    return extractArchive(file.bytes);
  }
  return [file];
}

export async function ingestFiles(inputs: IngestInput[]): Promise<IngestResult> {
  const result: IngestResult = { tables: [], images: [], skipped: [], warnings: [] };

  // Read + expand all inputs first (archives may contribute many files).
  const sources: SourceFile[] = [];
  for (const input of inputs) {
    const extension = extensionOf(input.name);
    let bytes: ArrayBuffer;
    try {
      bytes = await input.arrayBuffer();
    } catch {
      result.skipped.push({ name: input.name, reason: "Не удалось прочитать файл" });
      continue;
    }
    const base: SourceFile = { name: input.name, extension, bytes };
    try {
      sources.push(...(await flattenSources(base)));
    } catch {
      result.skipped.push({ name: input.name, reason: "Повреждённый архив" });
    }
  }

  for (const source of sources) {
    const { extension } = source;
    try {
      if (SPREADSHEET_EXTENSIONS.has(extension)) {
        result.tables.push(...parseWorkbook(source));
      } else if (TEXT_TABLE_EXTENSIONS.has(extension)) {
        result.tables.push(parseDelimitedText(source));
      } else if (IMAGE_EXTENSIONS.has(extension)) {
        result.images.push(toImageAsset(source));
      } else {
        result.skipped.push({ name: source.name, reason: `Формат .${extension} не поддерживается` });
      }
    } catch {
      result.skipped.push({ name: source.name, reason: "Ошибка разбора" });
    }
  }

  // Drop tables that came back completely empty.
  result.tables = result.tables.filter(
    (table) => table.headers.length > 0 && table.rows.length > 0,
  );

  if (result.tables.length === 0 && result.images.length === 0) {
    result.warnings.push("В загруженных файлах не найдено таблиц или изображений");
  }

  return result;
}
