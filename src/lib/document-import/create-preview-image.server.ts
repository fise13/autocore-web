import "server-only";

import sharp from "sharp";

const MAX_LONG_EDGE = 1600;
const WEBP_QUALITY = 82;

export type DocumentImportPreviewResult = {
  buffer: Buffer;
  contentType: "image/webp";
  width: number;
  height: number;
};

/**
 * Correct EXIF orientation, fit to max long edge, compress to WebP.
 * No OCR / AI — visual preview only.
 */
export async function createDocumentImportPreview(
  original: Buffer,
): Promise<DocumentImportPreviewResult> {
  const image = sharp(original, { failOn: "none" }).rotate();
  const meta = await image.metadata();
  const width = meta.width ?? 0;
  const height = meta.height ?? 0;
  const longEdge = Math.max(width, height);

  let pipeline = image;
  if (longEdge > MAX_LONG_EDGE && width > 0 && height > 0) {
    if (width >= height) {
      pipeline = pipeline.resize({ width: MAX_LONG_EDGE, withoutEnlargement: true });
    } else {
      pipeline = pipeline.resize({ height: MAX_LONG_EDGE, withoutEnlargement: true });
    }
  }

  const buffer = await pipeline.webp({ quality: WEBP_QUALITY }).toBuffer();
  const outMeta = await sharp(buffer).metadata();

  return {
    buffer,
    contentType: "image/webp",
    width: outMeta.width ?? width,
    height: outMeta.height ?? height,
  };
}
