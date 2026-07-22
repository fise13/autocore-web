import "server-only";

import sharp from "sharp";

const MAX_LONG_EDGE = 1600;
const JPEG_QUALITY = 82;
/** Hard cap on payload size sent to vision models (~1.5MB base64 ≈ 1.1MB binary). */
const MAX_BYTES = 1_200_000;

export type PreparedVisionImage = {
  dataUrl: string;
  contentType: "image/jpeg";
  width: number;
  height: number;
  byteSize: number;
};

/**
 * Downscale + JPEG-compress an image for OpenRouter vision calls.
 * Cuts tokens/latency vs raw phone HEIC/PNG while keeping spreadsheet text readable.
 */
export async function prepareVisionImageDataUrl(
  original: Buffer,
  _mimeHint?: string,
): Promise<PreparedVisionImage> {
  let pipeline = sharp(original, { failOn: "none" }).rotate();
  const meta = await pipeline.metadata();
  const width = meta.width ?? 0;
  const height = meta.height ?? 0;
  const longEdge = Math.max(width, height);

  if (longEdge > MAX_LONG_EDGE && width > 0 && height > 0) {
    pipeline =
      width >= height
        ? pipeline.resize({ width: MAX_LONG_EDGE, withoutEnlargement: true })
        : pipeline.resize({ height: MAX_LONG_EDGE, withoutEnlargement: true });
  }

  let quality = JPEG_QUALITY;
  let buffer = await pipeline.jpeg({ quality, mozjpeg: true }).toBuffer();

  while (buffer.byteLength > MAX_BYTES && quality > 48) {
    quality -= 10;
    buffer = await sharp(buffer, { failOn: "none" })
      .jpeg({ quality, mozjpeg: true })
      .toBuffer();
  }

  if (buffer.byteLength > MAX_BYTES) {
    buffer = await sharp(buffer, { failOn: "none" })
      .resize({ width: 1280, withoutEnlargement: true })
      .jpeg({ quality: 70, mozjpeg: true })
      .toBuffer();
  }

  const outMeta = await sharp(buffer).metadata();
  const contentType = "image/jpeg" as const;
  return {
    dataUrl: `data:${contentType};base64,${buffer.toString("base64")}`,
    contentType,
    width: outMeta.width ?? width,
    height: outMeta.height ?? height,
    byteSize: buffer.byteLength,
  };
}
