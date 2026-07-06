import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { searchDomain } from './domain-dictionary';

describe('domain search', () => {
  it('finds engine codes by prefix', () => {
    const hits = searchDomain('engines', 'ej20', null, { limit: 5 });
    assert.ok(hits.length > 0);
    assert.ok(hits.some((hit) => hit.entry.name.toUpperCase().includes('EJ20')));
  });

  it('finds brands by prefix', () => {
    const hits = searchDomain('brands', 'sub', null, { limit: 5 });
    assert.ok(hits.length > 0);
  });
});
