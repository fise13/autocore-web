import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { applySuggestion, replaceLastToken } from './replace-token';
import { filterAutocompleteOptions } from './filter-options';

describe('replace-token', () => {
  it('replaces full value', () => {
    assert.equal(applySuggestion('abc', 'EJ205', 'full'), 'EJ205');
  });

  it('replaces last token only', () => {
    assert.equal(replaceLastToken('motor EJ2', 'EJ205'), 'motor EJ205');
    assert.equal(applySuggestion('motor EJ2', 'EJ205', 'token'), 'motor EJ205');
  });
});

describe('filter-options', () => {
  it('limits to max suggestions', () => {
    const result = filterAutocompleteOptions(
      '',
      [
        { value: 'alpha' },
        { value: 'beta' },
        { value: 'gamma' },
        { value: 'delta' },
        { value: 'epsilon' },
        { value: 'zeta' },
      ],
      'prefix',
      5,
    );
    assert.equal(result.length, 5);
  });
});
