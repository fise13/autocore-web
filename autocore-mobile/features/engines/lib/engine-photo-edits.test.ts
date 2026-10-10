import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import {
  MAX_ENGINE_PHOTOS,
  photosRoomLeft,
  withAddedPhotos,
  withMainPhoto,
  withoutPhoto,
} from './engine-photo-edits';

describe('engine photo edits', () => {
  it('appends new photos, skipping blanks and duplicates, up to the cap', () => {
    assert.deepEqual(withAddedPhotos(['a', ' '], ['b', 'a', '']), ['a', 'b']);
    const full = Array.from({ length: MAX_ENGINE_PHOTOS }, (_, i) => `p${i}`);
    assert.equal(withAddedPhotos(full, ['extra']).length, MAX_ENGINE_PHOTOS);
    assert.equal(photosRoomLeft(full), 0);
  });

  it('makes a photo the main one by moving it to the front', () => {
    assert.deepEqual(withMainPhoto(['a', 'b', 'c'], 2), ['c', 'a', 'b']);
    assert.deepEqual(withMainPhoto(['a', 'b'], 0), ['a', 'b']);
    assert.deepEqual(withMainPhoto(['a', 'b'], 9), ['a', 'b']);
  });

  it('removes one photo and ignores an index that is out of range', () => {
    assert.deepEqual(withoutPhoto(['a', 'b', 'c'], 1), ['a', 'c']);
    assert.deepEqual(withoutPhoto(['a'], 5), ['a']);
  });
});
