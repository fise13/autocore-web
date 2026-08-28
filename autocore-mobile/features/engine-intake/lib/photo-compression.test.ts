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
  it('downscales a full 12 MP camera frame to 1920', () => {
    const plan = planPhotoCompression({ sizeBytes: 4 * 1024 * 1024, dimensions: TWELVE_MP });
    assert.equal(plan.action, 'resize');
    if (plan.action !== 'resize') return;
    assert.equal(plan.longEdge, MAX_PHOTO_LONG_EDGE);
    assert.equal(plan.quality, PHOTO_JPEG_QUALITY);
    assert.ok(plan.longEdge <= 1920);
    assert.ok(plan.longEdge >= 1600);
  });

  it('keeps quality in the 0.7–0.8 band', () => {
    assert.ok(PHOTO_JPEG_QUALITY >= 0.7);
    assert.ok(PHOTO_JPEG_QUALITY <= 0.8);
  });

  it('re-encodes a 1920 px file that is still heavy', () => {
    const plan = planPhotoCompression({
      sizeBytes: 1.5 * 1024 * 1024,
      dimensions: { width: 1920, height: 1080 },
    });
    assert.deepEqual(plan, { action: 'reencode', quality: PHOTO_JPEG_QUALITY });
  });

  it('leaves a photo that is already small in bytes and pixels alone', () => {
    const plan = planPhotoCompression({
      sizeBytes: MIN_COMPRESSIBLE_BYTES - 1,
      dimensions: { width: 1280, height: 720 },
    });
    assert.deepEqual(plan, { action: 'keep', reason: 'small-enough' });
  });

  it('still downscales a 12 MP frame even if the file is already small', () => {
    const plan = planPhotoCompression({
      sizeBytes: 80 * 1024,
      dimensions: TWELVE_MP,
    });
    assert.equal(plan.action, 'resize');
  });

  it('caps a heavy file with unknown dimensions rather than shipping it raw', () => {
    const plan = planPhotoCompression({
      sizeBytes: 5 * 1024 * 1024,
      dimensions: null,
    });
    assert.equal(plan.action, 'resize');
    if (plan.action !== 'resize') return;
    assert.equal(plan.longEdge, MAX_PHOTO_LONG_EDGE);
  });

  it('never upscales', () => {
    const plan = planPhotoCompression({
      sizeBytes: MIN_COMPRESSIBLE_BYTES - 1,
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
    assert.equal(isWorthReplacing(4 * 1024 * 1024, 400 * 1024), true);
  });

  it('rejects a re-encode that barely shrinks the file', () => {
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
