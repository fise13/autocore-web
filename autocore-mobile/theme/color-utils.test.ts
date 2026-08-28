import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { pressedRowFill, withAlpha } from './color-utils';

describe('withAlpha', () => {
  it('appends an alpha channel to a six-digit hex', () => {
    assert.equal(withAlpha('#FF0000', 1), '#FF0000ff');
    assert.equal(withAlpha('#FF0000', 0), '#FF000000');
  });

  it('clamps instead of producing an invalid channel', () => {
    assert.equal(withAlpha('#FF0000', 2), '#FF0000ff');
    assert.equal(withAlpha('#FF0000', -1), '#FF000000');
  });

  it('converts rgb() rather than mangling it', () => {
    assert.equal(withAlpha('rgb(255, 0, 0)', 0.5), 'rgba(255, 0, 0, 0.5)');
  });

  it('leaves a colour it cannot safely rewrite alone', () => {
    assert.equal(withAlpha('rgba(1, 2, 3, 0.4)', 0.9), 'rgba(1, 2, 3, 0.4)');
    assert.equal(withAlpha('red', 0.5), 'red');
  });
});

describe('pressedRowFill', () => {
  it('is one definition — the nine that existed had drifted apart', () => {
    // Six call sites agreed, order-row used 0.9 in light, Home and Finance
    // tinted with a different colour entirely, and settings-row used full
    // strength. Rows two screens apart are hard to compare, which is how that
    // survived.
    assert.equal(pressedRowFill('#808080', false), pressedRowFill('#808080', false));
  });

  it('tints more gently in the dark, where the same alpha reads heavier', () => {
    const dark = pressedRowFill('#808080', true);
    const light = pressedRowFill('#808080', false);
    assert.notEqual(dark, light);
    const alphaOf = (value: string) => parseInt(value.slice(7), 16);
    assert.ok(alphaOf(dark) < alphaOf(light));
  });

  it('produces a colour a style prop can take', () => {
    assert.match(pressedRowFill('#1C1C1E', true), /^#[0-9a-fA-F]{8}$/);
  });
});
