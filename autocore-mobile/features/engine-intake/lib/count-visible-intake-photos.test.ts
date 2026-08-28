import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { countVisibleIntakePhotos } from './count-visible-intake-photos';

describe('countVisibleIntakePhotos', () => {
  it('counts a new session from local rows alone', () => {
    assert.deepEqual(
      countVisibleIntakePhotos({
        serverCaptured: 0,
        photos: [
          { status: 'queued' },
          { status: 'uploading' },
          { status: 'completed', serverPhotoId: 'a' },
          { status: 'completed', serverPhotoId: 'b' },
        ],
      }),
      { total: 4, pending: 2, failed: 0, completed: 2 },
    );
  });

  it('does not count a shot twice while its bytes are still going up', () => {
    // The regression this exists for: `prepare` creates the server photo
    // document immediately, so the job's `capturedCount` includes a photo whose
    // upload has barely started. Adding the local row on top turned three
    // shutter presses into "5 photos" for the whole of a slow upload.
    const counts = countVisibleIntakePhotos({
      serverCaptured: 3,
      photos: [
        { status: 'uploading', serverPhotoId: 'a' },
        { status: 'uploading', serverPhotoId: 'b' },
        { status: 'uploading', serverPhotoId: 'c' },
      ],
    });
    assert.equal(counts.total, 3);
    assert.equal(counts.pending, 3);
  });

  it('adds shots the server has never been told about', () => {
    assert.equal(
      countVisibleIntakePhotos({
        serverCaptured: 2,
        photos: [
          { status: 'uploading', serverPhotoId: 'a' },
          { status: 'uploading', serverPhotoId: 'b' },
          { status: 'queued' },
          { status: 'queued' },
        ],
      }).total,
      4,
    );
  });

  it('does not dip while a just-prepared row waits for the next snapshot', () => {
    // Firestore pushes the updated job a beat after `prepare` answers. Reading
    // the server count alone would drop the number back for that beat.
    assert.equal(
      countVisibleIntakePhotos({
        serverCaptured: 0,
        photos: [{ status: 'uploading', serverPhotoId: 'a' }],
      }).total,
      1,
    );
  });

  it('does not add completed local rows on top of the server count', () => {
    assert.equal(
      countVisibleIntakePhotos({
        serverCaptured: 4,
        photos: [
          { status: 'completed', serverPhotoId: 'a' },
          { status: 'completed', serverPhotoId: 'b' },
          { status: 'completed', serverPhotoId: 'c' },
          { status: 'completed', serverPhotoId: 'd' },
        ],
      }).total,
      4,
    );
  });

  it('keeps completed local shots when the server has not caught up', () => {
    assert.equal(
      countVisibleIntakePhotos({
        serverCaptured: 0,
        photos: [
          { status: 'completed', serverPhotoId: 'a' },
          { status: 'completed', serverPhotoId: 'b' },
          { status: 'completed', serverPhotoId: 'c' },
        ],
      }).total,
      3,
    );
  });

  it('skips conflict rows so a duplicate finalize is not a fifth photo', () => {
    assert.equal(
      countVisibleIntakePhotos({
        serverCaptured: 4,
        photos: [
          { status: 'completed', serverPhotoId: 'a' },
          { status: 'failed', errorInfo: { code: 'CONFLICT' } },
        ],
      }).total,
      4,
    );
  });

  it('skips already-on-server leftovers that have not been coded CONFLICT yet', () => {
    assert.equal(
      countVisibleIntakePhotos({
        serverCaptured: 4,
        photos: [
          { status: 'completed', serverPhotoId: 'a' },
          { status: 'completed', serverPhotoId: 'b' },
          { status: 'completed', serverPhotoId: 'c' },
          { status: 'completed', serverPhotoId: 'd' },
          { status: 'failed', lastError: 'Photo is already on the server' },
        ],
      }).total,
      4,
    );
  });

  it('counts a row from an older build that has no server id yet', () => {
    assert.equal(
      countVisibleIntakePhotos({
        serverCaptured: 0,
        photos: [{ status: 'queued' }],
      }).total,
      1,
    );
  });
});
