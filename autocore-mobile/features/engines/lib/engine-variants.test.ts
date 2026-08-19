import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import type { MotorEntity } from '@/types/motor';

import {
  engineMatchesQuery,
  engineThumbnailUrl,
  engineUnitLabel,
  engineUnitLocation,
  engineVariantKey,
  engineVariantTitle,
  groupEnginesByVariant,
  sortEnginesForCatalog,
  variantHeading,
  variantSubtitle,
} from './engine-variants';

function motor(partial: Partial<MotorEntity> & { id: string }): MotorEntity {
  return {
    companyId: 'c1',
    serialCode: '',
    configuration: '',
    notes: '',
    quantity: 1,
    transmission: '',
    arrivalDate: null,
    ...partial,
  };
}

describe('engineVariantKey', () => {
  it('folds the same brand and code together regardless of casing', () => {
    const left = motor({ id: '1', brandName: 'Toyota', engineCode: '2AZ-FE' });
    const right = motor({ id: '2', brandName: 'toyota', engineCode: '2az-fe' });
    assert.equal(engineVariantKey(left), engineVariantKey(right));
  });

  it('keeps different codes of the same brand apart', () => {
    const left = motor({ id: '1', brandName: 'Subaru', engineCode: 'EJ257' });
    const right = motor({ id: '2', brandName: 'Subaru', engineCode: 'EJ255' });
    assert.notEqual(engineVariantKey(left), engineVariantKey(right));
  });

  it('buckets engines with neither brand nor code', () => {
    assert.equal(engineVariantKey(motor({ id: '1' })), 'unspecified');
    assert.equal(engineVariantKey(motor({ id: '2', brandName: '  ' })), 'unspecified');
  });
});

describe('engineVariantTitle', () => {
  it('reads brand then code', () => {
    assert.equal(
      engineVariantTitle(motor({ id: '1', brandName: 'Toyota', engineCode: '2AZ-FE' })),
      'Toyota 2AZ-FE',
    );
  });

  it('falls back through code, then configuration, then a neutral label', () => {
    assert.equal(engineVariantTitle(motor({ id: '1', engineCode: 'EJ257' })), 'EJ257');
    assert.equal(engineVariantTitle(motor({ id: '2', configuration: 'V6 3.0' })), 'V6 3.0');
    assert.equal(engineVariantTitle(motor({ id: '3' })), 'Unspecified engine');
  });
});

describe('engineUnitLabel', () => {
  it('prefers the serial a person reads off the block', () => {
    assert.equal(engineUnitLabel(motor({ id: '9', serialCode: 'EJ257-12345' })), 'EJ257-12345');
  });

  it('falls back to the local id when no serial was recorded', () => {
    assert.equal(engineUnitLabel(motor({ id: '9', localId: 42 })), '#42');
    assert.equal(engineUnitLabel(motor({ id: '9' })), '#9');
  });
});

describe('engineUnitLocation', () => {
  it('prefers the structured location code over the free-text field', () => {
    assert.equal(
      engineUnitLocation(motor({ id: '1', primaryLocationCode: 'A-03', warehouseLocation: 'yard' })),
      'A-03',
    );
    assert.equal(engineUnitLocation(motor({ id: '2', warehouseLocation: 'Back yard' })), 'Back yard');
  });

  it('returns null when nobody has placed the unit', () => {
    assert.equal(engineUnitLocation(motor({ id: '1' })), null);
    assert.equal(engineUnitLocation(motor({ id: '2', primaryLocationCode: '   ' })), null);
  });
});

describe('engineThumbnailUrl', () => {
  it('takes the first usable photo', () => {
    assert.equal(
      engineThumbnailUrl(motor({ id: '1', photoUrls: ['   ', 'https://a/1.jpg'] })),
      'https://a/1.jpg',
    );
  });

  it('returns null when there are no photos', () => {
    assert.equal(engineThumbnailUrl(motor({ id: '1' })), null);
    assert.equal(engineThumbnailUrl(motor({ id: '2', photoUrls: [] })), null);
  });
});

describe('groupEnginesByVariant', () => {
  const units = [
    motor({ id: '1', brandName: 'Toyota', engineCode: '2AZ-FE', serialCode: 'T-2' }),
    motor({ id: '2', brandName: 'Subaru', engineCode: 'EJ257', serialCode: 'S-1' }),
    motor({ id: '3', brandName: 'Toyota', engineCode: '2AZ-FE', serialCode: 'T-10' }),
    motor({ id: '4', brandName: 'Toyota', engineCode: '2AZ-FE', serialCode: 'T-1' }),
    motor({ id: '5' }),
  ];

  it('leads with the variant the yard has depth in', () => {
    const variants = groupEnginesByVariant(units);
    assert.equal(variants[0]?.title, 'Toyota 2AZ-FE');
    assert.equal(variants[0]?.units.length, 3);
  });

  it('sinks the unspecified bucket to the bottom', () => {
    const variants = groupEnginesByVariant(units);
    assert.equal(variants[variants.length - 1]?.id, 'unspecified');
  });

  it('sorts units naturally so T-2 precedes T-10', () => {
    const variants = groupEnginesByVariant(units);
    assert.deepEqual(
      variants[0]?.units.map((unit) => unit.serialCode),
      ['T-1', 'T-2', 'T-10'],
    );
  });

  it('breaks equal-depth ties alphabetically', () => {
    const variants = groupEnginesByVariant([
      motor({ id: '1', brandName: 'Nissan', engineCode: 'RB26' }),
      motor({ id: '2', brandName: 'Honda', engineCode: 'K20' }),
    ]);
    assert.deepEqual(
      variants.map((variant) => variant.title),
      ['Honda K20', 'Nissan RB26'],
    );
  });

  it('handles an empty catalog', () => {
    assert.deepEqual(groupEnginesByVariant([]), []);
  });
});

describe('sortEnginesForCatalog', () => {
  it('clusters the same variant, then sorts serials naturally', () => {
    const sorted = sortEnginesForCatalog([
      motor({ id: '1', brandName: 'Toyota', engineCode: '2AZ-FE', serialCode: 'T-10' }),
      motor({ id: '2', brandName: 'Subaru', engineCode: 'EJ257', serialCode: 'S-1' }),
      motor({ id: '3', brandName: 'Toyota', engineCode: '2AZ-FE', serialCode: 'T-2' }),
      motor({ id: '4', brandName: 'Toyota', engineCode: '2AZ-FE', serialCode: 'T-1' }),
    ]);
    assert.deepEqual(
      sorted.map((unit) => unit.serialCode),
      ['S-1', 'T-1', 'T-2', 'T-10'],
    );
  });
});

describe('engineMatchesQuery', () => {
  const unit = motor({
    id: '1',
    brandName: 'Toyota',
    engineCode: '2AZ-FE',
    serialCode: 'T-441',
    primaryLocationCode: 'A-03',
    quality: '2',
  });

  it('still matches serial, brand, code, and shelf', () => {
    assert.equal(engineMatchesQuery(unit, 'T-441'), true);
    assert.equal(engineMatchesQuery(unit, 'toyota'), true);
    assert.equal(engineMatchesQuery(unit, '2az'), true);
    assert.equal(engineMatchesQuery(unit, 'A-03'), true);
    assert.equal(engineMatchesQuery(unit, 'missing'), false);
  });

  it('matches quality by label, alias, and the shop digit', () => {
    assert.equal(engineMatchesQuery(unit, 'excellent'), true);
    assert.equal(engineMatchesQuery(unit, 'отличное'), true);
    assert.equal(engineMatchesQuery(unit, '2'), true);
    assert.equal(engineMatchesQuery(unit, 'poor'), false);
    assert.equal(engineMatchesQuery(motor({ id: '9', quality: '3' }), 'плохое'), true);
    assert.equal(engineMatchesQuery(motor({ id: '9' }), 'ungraded'), true);
  });
});

describe('variantSubtitle', () => {
  it('counts units and calls out the unplaced ones', () => {
    const variants = groupEnginesByVariant([
      motor({ id: '1', brandName: 'Toyota', engineCode: '2AZ-FE', primaryLocationCode: 'A-1' }),
      motor({ id: '2', brandName: 'Toyota', engineCode: '2AZ-FE' }),
    ]);
    assert.equal(variantSubtitle(variants[0]!), '2 units · 1 unplaced');
  });

  it('stays quiet when every unit is placed, or none are', () => {
    const placed = groupEnginesByVariant([
      motor({ id: '1', brandName: 'Toyota', engineCode: '2AZ-FE', primaryLocationCode: 'A-1' }),
    ]);
    assert.equal(variantSubtitle(placed[0]!), '1 unit');

    const unplaced = groupEnginesByVariant([
      motor({ id: '1', brandName: 'Toyota', engineCode: '2AZ-FE' }),
      motor({ id: '2', brandName: 'Toyota', engineCode: '2AZ-FE' }),
    ]);
    assert.equal(variantSubtitle(unplaced[0]!), '2 units');
  });
});

describe('variantHeading', () => {
  it('files the motor under its code, with the brand as a kicker', () => {
    const variants = groupEnginesByVariant([
      motor({ id: '1', brandName: 'Toyota', engineCode: '2AZ-FE' }),
    ]);
    assert.deepEqual(variantHeading(variants[0]!), { kicker: 'Toyota', title: '2AZ-FE' });
  });

  it('falls back to the full title when brand or code is missing', () => {
    const codeOnly = groupEnginesByVariant([motor({ id: '1', engineCode: 'EJ257' })]);
    assert.deepEqual(variantHeading(codeOnly[0]!), { kicker: null, title: 'EJ257' });
  });
});
