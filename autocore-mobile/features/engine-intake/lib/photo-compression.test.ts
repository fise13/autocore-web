import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import {
  isWorthReplacing,
  MAX_PHOTO_LONG_EDGE,
  MIN_COMPRESSIBLE_BYTES,
  planPhotoCompression,
  PHOTO_JPEG_QUALITY,
  resizeTarget,
} from './photo-compression';

const TWELVE_MP = { width: 4032, height: 3024 };

describe('planPhotoCompression', () => {
  it('downscales a full 12 MP camera frame', () => {
    const plan = planPhotoCompression({ sizeBytes: 4 * 1024 * 1024, dimensions: TWELVE_MP });
    assert.equal(plan.action, 'resize');
    if (plan.action !== 'resize') return;
    assert.equal(plan.longEdge, MAX_PHOTO_LONG_EDGE);
    assert.equal(plan.quality, PHOTO_JPEG_QUALITY);
  });

  it('keeps enough resolution for serial-plate OCR', () => {
    // The whole point of the feature is AI Vision, so guard the floor: a
    // downscaled 12 MP frame must stay well above 1080p on its long edge.
    const plan = planPhotoCompression({ sizeBytes: 4 * 1024 * 1024, dimensions: TWELVE_MP });
    assert.equal(plan.action, 'resize');
    if (plan.action !== 'resize') return;
    assert.ok(plan.longEdge >= 2048, 'long edge must stay OCR-usable');
    assert.ok(plan.quality >= 0.8, 'quality must stay above the ringing threshold');
  });

  it('leaves a photo that is already small in bytes alone', () => {
    const plan = planPhotoCompression({
      sizeBytes: MIN_COMPRESSIBLE_BYTES - 1,
      dimensions: TWELVE_MP,
    });
    assert.deepEqual(plan, { action: 'keep', reason: 'small-enough' });
  });

  it('never re-encodes a photo already at or under the target', () => {
    const plan = planPhotoCompression({
      sizeBytes: 3 * 1024 * 1024,
      dimensions: { width: MAX_PHOTO_LONG_EDGE, height: 2000 },
    });
    assert.deepEqual(plan, { action: 'keep', reason: 'within-target' });
  });

  it('ships the frame as captured when dimensions are unknown', () => {
    for (const dimensions of [null, undefined, { width: 0, height: 100 }, { width: Number.NaN, height: 1 }]) {
      const plan = planPhotoCompression({ sizeBytes: 5 * 1024 * 1024, dimensions });
      assert.deepEqual(plan, { action: 'keep', reason: 'unknown-dimensions' });
    }
  });

  it('never upscales', () => {
    const plan = planPhotoCompression({
      sizeBytes: 5 * 1024 * 1024,
      dimensions: { width: 800, height: 600 },
    });
    assert.equal(plan.action, 'keep');
  });
});

describe('resizeTarget', () => {
  it('preserves aspect ratio on a landscape frame', () => {
    const target = resizeTarget(TWELVE_MP, MAX_PHOTO_LONG_EDGE);
    assert.equal(target.width, MAX_PHOTO_LONG_EDGE);
    assert.equal(target.height, Math.round(3024 * (MAX_PHOTO_LONG_EDGE / 4032)));
  });

  it('handles portrait frames from the same policy', () => {
    const target = resizeTarget({ width: 3024, height: 4032 }, MAX_PHOTO_LONG_EDGE);
    assert.equal(target.height, MAX_PHOTO_LONG_EDGE);
    assert.ok(target.width < target.height);
  });

  it('returns the original when it already fits', () => {
    const small = { width: 1000, height: 800 };
    assert.deepEqual(resizeTarget(small, MAX_PHOTO_LONG_EDGE), small);
  });
});

describe('isWorthReplacing', () => {
  it('keeps a replacement that saves real bandwidth', () => {
    assert.equal(isWorthReplacing(4 * 1024 * 1024, 900 * 1024), true);
  });

  it('rejects a re-encode that barely shrinks the file', () => {
    // Losing detail for a 5% saving is a bad trade on photos feeding AI Vision.
    assert.equal(isWorthReplacing(1_000_000, 950_000), false);
  });

  it('rejects a replacement that grew', () => {
    assert.equal(isWorthReplacing(1_000_000, 1_200_000), false);
  });

  it('rejects an empty or unreadable replacement', () => {
    assert.equal(isWorthReplacing(1_000_000, 0), false);
    assert.equal(isWorthReplacing(1_000_000, Number.NaN), false);
  });

  it('rejects when the original size is unknown', () => {
    assert.equal(isWorthReplacing(0, 500), false);
  });
});
