import "server-only";

import { readFileSync, existsSync } from "node:fs";
import path from "node:path";

import { DOCUMENT_PRINT_STYLES } from "@/lib/documents/document-print-styles";

const COMPILED_PATHS = [
  path.join(process.cwd(), "src/lib/documents/documents-compiled.css"),
  path.join(process.cwd(), ".next/documents.css"),
];

let cachedCss: string | null = null;

export function getDocumentsCss(): string {
  if (cachedCss) return cachedCss;

  for (const filePath of COMPILED_PATHS) {
    if (existsSync(filePath)) {
      cachedCss = readFileSync(filePath, "utf8");
      return cachedCss;
    }
  }

  cachedCss = DOCUMENT_PRINT_STYLES;
  return cachedCss;
}
