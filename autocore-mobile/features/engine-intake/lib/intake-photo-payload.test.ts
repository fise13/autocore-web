import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { normalizeIntakePhotoPayload } from './intake-photo-payload';

describe('normalizeIntakePhotoPayload', () => {
  it('rejects empty or non-integer sizes before the API sees them', () => {
    assert.equal(
      normalizeIntakePhotoPayload({
        localUri: 'file:///shot.jpg',
        mimeType: 'image/jpeg',
        sizeBytes: 0,
      }).ok,
      false,
    );
    assert.equal(
      normalizeIntakePhotoPayload({
        localUri: 'file:///shot.jpg',
        mimeType: 'image/jpeg',
        sizeBytes: 12.7,
      }).ok,
      true,
    );
    const truncated = normalizeIntakePhotoPayload({
      localUri: 'file:///shot.jpg',
      mimeType: 'image/jpeg',
      sizeBytes: 12.7,
    });
    assert.equal(truncated.ok && truncated.value.sizeBytes, 12);
  });

  it('fills jpeg from the path when mime is missing', () => {
    const result = normalizeIntakePhotoPayload({
      localUri: 'file:///documents/engine-intake/photo_1.jpg',
      mimeType: '',
      sizeBytes: 4096,
    });
    assert.equal(result.ok, true);
    if (result.ok) assert.equal(result.value.contentType, 'image/jpeg');
  });

  it('maps image/jpg to image/jpeg', () => {
    const result = normalizeIntakePhotoPayload({
      localUri: 'file:///a.bin',
      mimeType: 'image/jpg',
      sizeBytes: 100,
    });
    assert.equal(result.ok, true);
    if (result.ok) assert.equal(result.value.contentType, 'image/jpeg');
  });

  it('rejects unknown types that cannot be inferred', () => {
    const result = normalizeIntakePhotoPayload({
      localUri: 'file:///a.bin',
      mimeType: 'application/octet-stream',
      sizeBytes: 100,
    });
    assert.equal(result.ok, false);
    if (!result.ok) assert.equal(result.error.code, 'UNSUPPORTED_TYPE');
  });
});
