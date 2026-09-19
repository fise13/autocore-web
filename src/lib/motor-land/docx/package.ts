import JSZip from "jszip";

import type { SaleDocumentData } from "../sale-document";
import { buildSaleDocxParts, type DocxParts, type SaleDocxAssets } from "./build-sale-docx";

export const DOCX_MIME_TYPE =
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document";

/**
 * Zips the OOXML parts into a .docx. Deflate everywhere except the already
 * compressed PNGs, which are stored as-is.
 */
export async function packDocx(parts: DocxParts): Promise<Uint8Array> {
  const zip = new JSZip();

  for (const [path, content] of Object.entries(parts)) {
    const binary = typeof content !== "string";
    zip.file(path, content, {
      binary,
      compression: binary ? "STORE" : "DEFLATE",
      date: new Date(0),
    });
  }

  return zip.generateAsync({ type: "uint8array", mimeType: DOCX_MIME_TYPE });
}

export async function buildSaleDocx(
  data: SaleDocumentData,
  assets: SaleDocxAssets,
): Promise<Uint8Array> {
  return packDocx(buildSaleDocxParts(data, assets));
}
