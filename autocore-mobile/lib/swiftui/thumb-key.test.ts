import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { thumbCacheKey, thumbPixelWidth } from './thumb-key';

const URL_A =
  'https://firebasestorage.googleapis.com/v0/b/bucket/o/companies%2Fc1%2Fengine-intake%2Fjob1%2Fphoto.jpg?alt=media&token=abc';
const URL_B =
  'https://firebasestorage.googleapis.com/v0/b/bucket/o/companies%2Fc1%2Fengine-intake%2Fjob1%2Fother.jpg?alt=media&token=abc';

describe('thumbPixelWidth', () => {
  it('renders above logical size so the thumbnail is not soft on Retina', () => {
    assert.ok(thumbPixelWidth(56) >= 56 * 3);
  });

  it('buckets nearby sizes onto one file', () => {
    // A 56pt row and a 58pt row must not each get their own derivative.
    assert.equal(thumbPixelWidth(56), thumbPixelWidth(58));
  });

  it('never asks for something larger than a thumbnail needs', () => {
    assert.ok(thumbPixelWidth(4000) <= 1024);
  });
});

describe('thumbCacheKey', () => {
  it('is stable across calls — the second launch must find the file', () => {
    assert.equal(thumbCacheKey(URL_A, 56), thumbCacheKey(URL_A, 56));
  });

  it('separates different photos', () => {
    assert.notEqual(thumbCacheKey(URL_A, 56), thumbCacheKey(URL_B, 56));
  });

  it('separates different render sizes', () => {
    assert.notEqual(thumbCacheKey(URL_A, 56), thumbCacheKey(URL_A, 256));
  });

  it('is safe to use as a filename', () => {
    for (const url of [URL_A, URL_B, 'file:///var/mobile/a b/c.jpg', '']) {
      assert.match(thumbCacheKey(url, 56), /^[a-z0-9-]+$/);
    }
  });
});
