import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { resolvePreparedPhotoStep } from './prepared-photo-step';

const URL = 'https://firebasestorage.googleapis.com/v0/b/bucket/o/photo.jpg?token=abc';

describe('resolvePreparedPhotoStep', () => {
  it('sends the bytes when the server has nothing yet', () => {
    assert.deepEqual(
      resolvePreparedPhotoStep({ uploadUrl: 'https://signed', url: URL }),
      { step: 'upload' },
    );
  });

  it('finalizes when the PUT survived a kill but the row did not', () => {
    // The background URLSession outlives the app; the finalize request does not.
    assert.deepEqual(
      resolvePreparedPhotoStep({
        alreadyUploaded: true,
        url: URL,
        downloadToken: 'tok',
      }),
      { step: 'finalize' },
    );
  });

  it('settles a photo the server has already finished', () => {
    assert.deepEqual(
      resolvePreparedPhotoStep({
        alreadyUploaded: true,
        alreadyFinalized: true,
        url: URL,
        downloadToken: 'tok',
      }),
      { step: 'settle', url: URL },
    );
  });

  it('settles rather than finalizing against an empty token', () => {
    // The exact shape that produced "Invalid intake photo finalization" on the
    // camera: a finished photo, described without a token, finalized anyway,
    // rejected 400 as non-retryable, red forever.
    assert.deepEqual(
      resolvePreparedPhotoStep({
        alreadyUploaded: true,
        url: URL,
        downloadToken: '',
      }),
      { step: 'settle', url: URL },
    );
  });

  it('does not settle on a blank URL — there would be nothing to keep', () => {
    assert.deepEqual(
      resolvePreparedPhotoStep({ alreadyFinalized: true, url: '   ' }),
      { step: 'finalize' },
    );
  });
});
