import "server-only";

import { readFileSync, existsSync } from "node:fs";
import path from "node:path";

import { DOCUMENT_PRINT_STYLES } from "@/lib/documents/document-print-styles";

const COMPILED_PATHS = [
  path.join(process.cwd(), "src/lib/documents/documents-compiled.css"),
  path.join(process.cwd(), ".next/documents.css"),
];

const PDF_STYLE_PATHS = [
  path.join(process.cwd(), "src/styles/document-pdf-fonts.css"),
  path.join(process.cwd(), "src/styles/document-pdf-template.css"),
  path.join(process.cwd(), "src/styles/document-pdf-header.css"),
  path.join(process.cwd(), "src/styles/document-pdf-racing.css"),
  path.join(process.cwd(), "src/styles/document-pdf-watermark.css"),
];

function readPdfStyles(): string {
  return PDF_STYLE_PATHS.map((filePath) => {
    if (!existsSync(filePath)) return "";
    return readFileSync(filePath, "utf8");
  })
    .filter(Boolean)
    .join("\n");
}

let cachedCss: string | null = null;

export function getDocumentsCss(): string {
  if (cachedCss) return cachedCss;

  const pdfStyles = readPdfStyles();

  for (const filePath of COMPILED_PATHS) {
    if (existsSync(filePath)) {
      cachedCss = `${readFileSync(filePath, "utf8")}\n${pdfStyles}`;
      return cachedCss;
    }
  }

  cachedCss = `${DOCUMENT_PRINT_STYLES}\n${pdfStyles}`;
  return cachedCss;
}
