import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { formatAutocompleteOption } from './format-option';

describe('formatAutocompleteOption', () => {
  it('splits a name · phone label into title and subtitle', () => {
    const display = formatAutocompleteOption({
      value: 'John Smith',
      label: 'John Smith · +1 555 0100',
    });
    assert.equal(display.primary, 'John Smith');
    assert.equal(display.secondary, '+1 555 0100');
  });

  it('uses the commit value as title when label is secondary copy', () => {
    const display = formatAutocompleteOption({
      value: 'John Smith',
      label: '+1 555 0100',
    });
    assert.equal(display.primary, 'John Smith');
    assert.equal(display.secondary, '+1 555 0100');
  });

  it('has no subtitle when label repeats the value', () => {
    const display = formatAutocompleteOption({ value: 'BMW', label: 'BMW' });
    assert.equal(display.primary, 'BMW');
    assert.equal(display.secondary, null);
  });

  it('does not throw when value is missing', () => {
    const display = formatAutocompleteOption({
      value: undefined as unknown as string,
      label: 'Fallback',
    });
    assert.equal(display.primary, 'Fallback');
  });
});
