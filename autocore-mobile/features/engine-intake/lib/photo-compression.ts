/**
 * How hard an intake photo is squeezed before it goes on the wire.
 *
 * The camera still uses `skipProcessing: true` so the shutter stays instant —
 * the full sensor JPEG lands on disk first. This policy then replaces that
 * file before Storage sees it. A dozen 12 MP frames used to be 40–60 MB of
 * cellular; at 1920 px / 0.75 they are typically 2–4 MB for the whole walk.
 *
 * 1920 on the long edge is enough for bay review and Vision (serial plates
 * remain legible at ~2× 1080p). Anything larger is wasted bandwidth.
 *
 * Pure — no React Native — so the thresholds stay unit-testable.
 */

/** Long edge, in pixels, an intake photo is reduced to. */
export const MAX_PHOTO_LONG_EDGE = 1920;

/** JPEG / WebP quality used when a photo is re-encoded. */
export const PHOTO_JPEG_QUALITY = 0.75;

/**
 * Below this, a second encode cannot win enough to be worth the CPU.
 * A 200 KB frame is already cheap to send.
 */
export const MIN_COMPRESSIBLE_BYTES = 200 * 1024;

export type PhotoDimensions = {
  width: number;
  height: number;
};

export type CompressionPlan =
  | { action: 'keep'; reason: 'small-enough' }
  | { action: 'resize'; longEdge: number; quality: number; scale: number }
  | { action: 'reencode'; quality: number };

function usableDimension(value: number): boolean {
  return Number.isFinite(value) && value > 0;
}

/**
 * What to do with a captured frame.
 *
 * Pixel size always wins: a 12 MP file must be downscaled even if it is
 * already small in bytes. A frame already inside 1920 px is re-encoded when
 * it is still heavy (gallery HEIC/JPEG dumps). Tiny files are left alone.
 */
export function planPhotoCompression(input: {
  sizeBytes: number;
  dimensions?: PhotoDimensions | null;
}): CompressionPlan {
  const size = input.sizeBytes;
  const dimensions = input.dimensions;
  const hasDims =
    Boolean(dimensions) &&
    usableDimension(dimensions!.width) &&
    usableDimension(dimensions!.height);
  const longEdge = hasDims
    ? Math.max(dimensions!.width, dimensions!.height)
    : 0;

  if (hasDims && longEdge > MAX_PHOTO_LONG_EDGE) {
    return {
      action: 'resize',
      longEdge: MAX_PHOTO_LONG_EDGE,
      quality: PHOTO_JPEG_QUALITY,
      scale: MAX_PHOTO_LONG_EDGE / longEdge,
    };
  }

  if (!Number.isFinite(size) || size < MIN_COMPRESSIBLE_BYTES) {
    return { action: 'keep', reason: 'small-enough' };
  }

  if (hasDims) {
    return { action: 'reencode', quality: PHOTO_JPEG_QUALITY };
  }

  // No pixel size, but the file is heavy — treat as a 12 MP dump and cap it.
  return {
    action: 'resize',
    longEdge: MAX_PHOTO_LONG_EDGE,
    quality: PHOTO_JPEG_QUALITY,
    scale: 1,
  };
}

/**
 * The resize target for the image library, preserving aspect ratio. Returned
 * separately from the plan so the call site passes whole pixels, not a scale.
 */
export function resizeTarget(
  dimensions: PhotoDimensions,
  longEdge: number,
): PhotoDimensions {
  const currentLongEdge = Math.max(dimensions.width, dimensions.height);
  if (currentLongEdge <= longEdge) return dimensions;
  const scale = longEdge / currentLongEdge;
  return {
    width: Math.max(1, Math.round(dimensions.width * scale)),
    height: Math.max(1, Math.round(dimensions.height * scale)),
  };
}

/**
 * Whether a re-encoded replacement is worth keeping over the captured
 * original. Ties go to the original.
 */
export function isWorthReplacing(beforeBytes: number, afterBytes: number): boolean {
  if (!Number.isFinite(afterBytes) || afterBytes <= 0) return false;
  if (!Number.isFinite(beforeBytes) || beforeBytes <= 0) return false;
  return afterBytes <= beforeBytes * 0.9;
}
