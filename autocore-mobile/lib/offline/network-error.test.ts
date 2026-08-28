import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { isNetworkError } from './network-error';

describe('isNetworkError', () => {
  it('treats status 0 as offline', () => {
    assert.equal(isNetworkError({ status: 0, message: 'HTTP 0' }), true);
  });

  it('treats fetch failures as offline', () => {
    assert.equal(isNetworkError(new TypeError('Network request failed')), true);
    assert.equal(isNetworkError({ message: 'Failed to fetch' }), true);
    assert.equal(
      isNetworkError({ message: 'fetch failed: Сетевое соединение потеряно.' }),
      true,
    );
  });

  it('does not treat permission errors as offline', () => {
    assert.equal(isNetworkError({ status: 403, message: 'Forbidden' }), false);
    assert.equal(isNetworkError({ status: 400, message: 'Invalid request' }), false);
  });
});
