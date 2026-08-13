import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import type { MobileWarehouseLocation } from '@/hooks/use-mobile-relocate';

import {
  groupLocationsByZone,
  locationMatchesQuery,
  locationTypeLabel,
  locationZoneKey,
  zoneSubtitle,
  zoneTitle,
} from './location-groups';

function location(
  partial: Partial<MobileWarehouseLocation> & { id: string },
): MobileWarehouseLocation {
  return {
    warehouseId: 'w1',
    displayCode: partial.displayCode ?? partial.code ?? partial.id,
    code: partial.code ?? partial.id,
    type: 'custom',
    ...partial,
  };
}

describe('locationTypeLabel', () => {
  it('names the known tree levels and falls back for anything else', () => {
    assert.equal(locationTypeLabel('bin'), 'Bin');
    assert.equal(locationTypeLabel('rack'), 'Rack');
    assert.equal(locationTypeLabel('custom'), 'Location');
    assert.equal(locationTypeLabel('something-new'), 'Location');
  });
});

describe('locationZoneKey', () => {
  it('takes the head of the display path', () => {
    assert.equal(locationZoneKey(location({ id: '1', displayCode: 'A-03-2' })), 'A');
  });

  it('groups a flat code under itself', () => {
    assert.equal(locationZoneKey(location({ id: '1', displayCode: 'Yard' })), 'YARD');
  });

  it('survives a location with no codes at all', () => {
    assert.equal(locationZoneKey(location({ id: '1', displayCode: '', code: '' })), 'OTHER');
  });
});

describe('locationMatchesQuery', () => {
  const shelf = location({ id: '1', displayCode: 'A-03-2', code: '2', type: 'bin' });

  it('matches on the display path, the raw code, and the type', () => {
    assert.equal(locationMatchesQuery(shelf, 'A-03'), true);
    assert.equal(locationMatchesQuery(shelf, 'bin'), true);
  });

  it('rejects a non-match', () => {
    assert.equal(locationMatchesQuery(shelf, 'zzz'), false);
  });
});

describe('groupLocationsByZone', () => {
  const all = [
    location({ id: '1', displayCode: 'B-01', type: 'rack' }),
    location({ id: '2', displayCode: 'A-10', type: 'bin' }),
    location({ id: '3', displayCode: 'A-2', type: 'bin' }),
    location({ id: '4', displayCode: 'UNLOCATED', code: 'UNLOCATED', isSystem: true }),
  ];

  it('drops system leaves by default — they are holding pens, not places', () => {
    const zones = groupLocationsByZone(all);
    assert.deepEqual(
      zones.map((zone) => zone.id),
      ['A', 'B'],
    );
  });

  it('can include system leaves when asked', () => {
    const zones = groupLocationsByZone(all, true);
    assert.ok(zones.some((zone) => zone.id === 'UNLOCATED'));
  });

  it('sorts places naturally inside a zone so A-2 precedes A-10', () => {
    const zones = groupLocationsByZone(all);
    assert.deepEqual(
      zones[0]?.locations.map((entry) => entry.displayCode),
      ['A-2', 'A-10'],
    );
  });

  it('handles an empty warehouse', () => {
    assert.deepEqual(groupLocationsByZone([]), []);
  });
});

describe('zoneTitle', () => {
  it('names a path segment as a zone', () => {
    const [zone] = groupLocationsByZone([location({ id: '1', displayCode: 'A-01' })]);
    assert.equal(zoneTitle(zone!), 'Zone A');
  });

  it('leaves an already-named zone alone', () => {
    const [zone] = groupLocationsByZone([location({ id: '1', displayCode: 'YARD-1' })]);
    assert.equal(zoneTitle(zone!), 'YARD');
  });
});

describe('zoneSubtitle', () => {
  it('counts places and calls out bins when there are any', () => {
    const [zone] = groupLocationsByZone([
      location({ id: '1', displayCode: 'A-1', type: 'bin' }),
      location({ id: '2', displayCode: 'A-2', type: 'shelf' }),
    ]);
    assert.equal(zoneSubtitle(zone!), '2 places · 1 bin');
  });

  it('stays quiet when a zone has no bins', () => {
    const [zone] = groupLocationsByZone([location({ id: '1', displayCode: 'A-1', type: 'rack' })]);
    assert.equal(zoneSubtitle(zone!), '1 place');
  });
});
