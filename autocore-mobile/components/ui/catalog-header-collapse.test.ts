import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import {
  CATALOG_BAR_AT_TOP,
  CATALOG_BAR_TITLE_AT,
  CATALOG_BAR_TITLE_BACK_AT,
  catalogBarState,
} from './catalog-header-collapse';

describe('catalogBarState', () => {
  const top = CATALOG_BAR_AT_TOP;

  it('is bare at the top', () => {
    assert.deepEqual(catalogBarState({ offsetY: 0, current: top }), top);
    assert.deepEqual(
      catalogBarState({ offsetY: -60, current: { material: true, inlineTitle: true } }),
      top,
    );
  });

  it('takes on its material before it takes the title', () => {
    const under = catalogBarState({ offsetY: 20, current: top });
    assert.equal(under.material, true);
    assert.equal(under.inlineTitle, false);
  });

  it('takes the title once the large one has gone under', () => {
    const past = catalogBarState({ offsetY: CATALOG_BAR_TITLE_AT + 1, current: top });
    assert.equal(past.inlineTitle, true);
  });

  it('holds the title thresholds apart', () => {
    assert.ok(CATALOG_BAR_TITLE_BACK_AT < CATALOG_BAR_TITLE_AT);
    const between = (CATALOG_BAR_TITLE_BACK_AT + CATALOG_BAR_TITLE_AT) / 2;
    assert.equal(catalogBarState({ offsetY: between, current: top }).inlineTitle, false);
    assert.equal(
      catalogBarState({ offsetY: between, current: { material: true, inlineTitle: true } })
        .inlineTitle,
      true,
    );
  });

  it('returns the same object when nothing changed, so scrolling does not re-render', () => {
    const current = { material: true, inlineTitle: false };
    assert.equal(catalogBarState({ offsetY: 30, current }), current);
    assert.equal(catalogBarState({ offsetY: 31, current }), current);
  });

  it('treats a nonsense offset as the top', () => {
    assert.deepEqual(
      catalogBarState({ offsetY: Number.NaN, current: { material: true, inlineTitle: true } }),
      top,
    );
  });
});
