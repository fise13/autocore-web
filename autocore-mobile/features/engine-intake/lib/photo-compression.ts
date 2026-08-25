/**
 * How hard an intake photo may be squeezed before it is queued.
 *
 * Today nothing squeezes them at all. The camera is called with
 * `{ quality: 0.7, skipProcessing: true }`, and `skipProcessing` bypasses the
 * iOS re-encode that `quality` would have applied — so the full ~12 MP frame
 * (3–5 MB) is what lands on disk and what goes over the wire. That is not a
 * correctness bug, but on a bay walk of a dozen shots it is 40–60 MB of
 * cellular for images nothing needs at that size.
 *
 * The constraint pulling the other way is that these photos feed AI Vision:
 * serial-plate OCR, engine identification, component detection, damage
 * inspection. Squeezing for the sake of a smaller number would cost the
 * product the thing the photos exist for. So the policy is deliberately
 * conservative:
 *
 *  - only ever downscale, never upscale;
 *  - keep the long edge at 3072 px, well above what OCR of a stamped serial
 *    needs and roughly 2.5x the long edge of a legible plate crop;
 *  - re-encode at 0.85 JPEG, above the 0.75–0.8 range where ringing starts to
 *    eat fine stamped characters;
 *  - leave anything already at or under the target completely untouched, so a
 *    small or already-processed file is never re-encoded a second time and
 *    made worse.
 *
 * Pure — no React Native, no image library — so the thresholds are reviewable
 * and testable on their own, and the I/O stays at the call site.
 */

/** Long edge, in pixels, an intake photo is reduced to. */
export const MAX_PHOTO_LONG_EDGE = 3072;

/** JPEG quality used when a photo is re-encoded. */
export const PHOTO_JPEG_QUALITY = 0.85;

/**
 * Below this, re-encoding cannot win enough to be worth the quality risk.
 * A 900 KB frame is already cheap to send.
 */
export const MIN_COMPRESSIBLE_BYTES = 900 * 1024;

export type PhotoDimensions = {
  width: number;
  height: number;
};

export type CompressionPlan =
  | { action: 'keep'; reason: 'small-enough' | 'within-target' | 'unknown-dimensions' }
  | { action: 'resize'; longEdge: number; quality: number; scale: number };

function usableDimension(value: number): boolean {
  return Number.isFinite(value) && value > 0;
}

/**
 * What to do with a freshly captured frame.
 *
 * `sizeBytes` gates the work and `dimensions` decides the target, so a photo
 * that is already small in bytes is never touched however large its pixel
 * dimensions claim to be — re-encoding it could only lose detail.
 */
export function planPhotoCompression(input: {
  sizeBytes: number;
  dimensions?: PhotoDimensions | null;
}): CompressionPlan {
  if (!Number.isFinite(input.sizeBytes) || input.sizeBytes < MIN_COMPRESSIBLE_BYTES) {
    return { action: 'keep', reason: 'small-enough' };
  }

  const dimensions = input.dimensions;
  if (!dimensions || !usableDimension(dimensions.width) || !usableDimension(dimensions.height)) {
    // Without dimensions there is no safe target — a blind re-encode could
    // shrink a photo that was already downscaled. Ship it as captured.
    return { action: 'keep', reason: 'unknown-dimensions' };
  }

  const longEdge = Math.max(dimensions.width, dimensions.height);
  if (longEdge <= MAX_PHOTO_LONG_EDGE) {
    return { action: 'keep', reason: 'within-target' };
  }

  return {
    action: 'resize',
    longEdge: MAX_PHOTO_LONG_EDGE,
    quality: PHOTO_JPEG_QUALITY,
    scale: MAX_PHOTO_LONG_EDGE / longEdge,
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
 * original. A re-encode that saves nothing is a quality loss for no gain, so
 * the original wins ties — and on photos that feed OCR and component
 * detection, a marginal shrink is never worth losing detail for.
 */
export function isWorthReplacing(beforeBytes: number, afterBytes: number): boolean {
  if (!Number.isFinite(afterBytes) || afterBytes <= 0) return false;
  if (!Number.isFinite(beforeBytes) || beforeBytes <= 0) return false;
  return afterBytes <= beforeBytes * 0.9;
}
