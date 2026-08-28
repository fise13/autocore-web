import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { uniqueAutocompleteOptions } from './filter-options';

describe('uniqueAutocompleteOptions', () => {
  it('drops options with a missing value instead of throwing', () => {
    const options = uniqueAutocompleteOptions([
      { value: undefined as unknown as string, label: 'Nameless' },
      { value: 'Ada', label: 'Ada' },
      { value: '  ', label: 'Blank' },
    ]);
    assert.deepEqual(
      options.map((option) => option.value),
      ['Ada'],
    );
  });
});
