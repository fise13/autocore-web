import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { reuseUnchangedDocs, type DocEntityCache } from './reuse-unchanged-docs';

type Row = { id: string; v: unknown };

function snapshot(docs: Record<string, number>, changed: string[]) {
  return {
    docs: Object.entries(docs).map(([id, v]) => ({
      id,
      ref: { path: `motors/${id}` },
      data: () => ({ v }),
    })),
    docChanges: () => changed.map((id) => ({ type: 'modified', doc: { ref: { path: `motors/${id}` } } })),
  };
}

describe('reuseUnchangedDocs', () => {
  let parsed = 0;
  const map = (id: string, data: Record<string, unknown>): Row | null => {
    parsed += 1;
    return data.v === -1 ? null : { id, v: data.v };
  };

  it('re-parses only changed docs and keeps the rest by identity', () => {
    parsed = 0;
    const first = reuseUnchangedDocs(snapshot({ a: 1, b: 2, c: 3 }, ['a', 'b', 'c']), new Map(), map);
    const second = reuseUnchangedDocs(snapshot({ a: 1, b: 9, c: 3 }, ['b']), first.cache, map);
    assert.equal(parsed, 4);
    assert.equal(second.entities[0], first.entities[0]);
    assert.notEqual(second.entities[1], first.entities[1]);
    assert.equal(second.entities[1]!.v, 9);
  });

  it('drops docs that are gone even without a removal change (skipped snapshot)', () => {
    const first = reuseUnchangedDocs(snapshot({ a: 1, b: 2 }, ['a', 'b']), new Map(), map);
    const next = reuseUnchangedDocs(snapshot({ a: 1 }, []), first.cache, map);
    assert.deepEqual(next.entities.map((row) => row.id), ['a']);
  });

  it('remembers unparseable docs without re-parsing them', () => {
    parsed = 0;
    const cache: DocEntityCache<Row> = new Map();
    const first = reuseUnchangedDocs(snapshot({ bad: -1 }, ['bad']), cache, map);
    reuseUnchangedDocs(snapshot({ bad: -1 }, []), first.cache, map);
    assert.equal(parsed, 1);
    assert.equal(first.entities.length, 0);
  });
});
