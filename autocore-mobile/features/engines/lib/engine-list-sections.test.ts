import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import {
  groupEngineRowsIntoSections,
  limitEngineSections,
  type EngineRow,
} from './engine-list-sections';

function unit(id: string, lane: 'incoming' | 'yard' = 'yard'): EngineRow {
  return {
    type: 'unit',
    key: `u:${id}`,
    lane,
    position: 'only',
    motor: { id, companyId: 'c', serialCode: id } as never,
  };
}

function header(id: string, title = id): EngineRow {
  return { type: 'header', key: `h:${id}`, title, meta: '2 engines' };
}

describe('groupEngineRowsIntoSections', () => {
  it('groups units under the heading that precedes them', () => {
    const sections = groupEngineRowsIntoSections([
      header('1nz', '1NZ-FE'),
      unit('a'),
      unit('b'),
      header('2az', '2AZ-FE'),
      unit('c'),
    ]);
    assert.deepEqual(
      sections.map((section) => [section.title, section.units.length]),
      [
        ['1NZ-FE', 2],
        ['2AZ-FE', 1],
      ],
    );
  });

  it('keeps headingless units — Incoming has no header on its own', () => {
    // Dropping these would empty the bay for every worker whose lane is
    // Incoming, which is the default lane for anyone without catalog access.
    const sections = groupEngineRowsIntoSections([
      unit('a', 'incoming'),
      unit('b', 'incoming'),
    ]);
    assert.equal(sections.length, 1);
    assert.equal(sections[0]!.title, null);
    assert.equal(sections[0]!.units.length, 2);
  });

  it('handles the combined view — Incoming header then yard headings', () => {
    const sections = groupEngineRowsIntoSections([
      header('incoming', 'Incoming'),
      unit('a', 'incoming'),
      header('1nz', '1NZ-FE'),
      unit('b'),
    ]);
    assert.deepEqual(
      sections.map((section) => section.title),
      ['Incoming', '1NZ-FE'],
    );
  });

  it('drops a heading a filter left empty', () => {
    const sections = groupEngineRowsIntoSections([
      header('1nz', '1NZ-FE'),
      header('2az', '2AZ-FE'),
      unit('c'),
    ]);
    assert.deepEqual(
      sections.map((section) => section.title),
      ['2AZ-FE'],
    );
  });

  it('returns nothing for an empty stream', () => {
    assert.deepEqual(groupEngineRowsIntoSections([]), []);
  });

  it('keeps section keys unique so SwiftUI does not reuse a section', () => {
    const sections = groupEngineRowsIntoSections([
      unit('a', 'incoming'),
      header('1nz'),
      unit('b'),
    ]);
    assert.equal(new Set(sections.map((section) => section.key)).size, sections.length);
  });
});

describe('limitEngineSections', () => {
  const sections = groupEngineRowsIntoSections([
    header('a'),
    unit('a1'),
    unit('a2'),
    header('b'),
    unit('b1'),
    unit('b2'),
    unit('b3'),
  ]);

  it('cuts a section short at the limit and says more remain', () => {
    const page = limitEngineSections(sections, 3);
    assert.deepEqual(
      page.sections.map((section) => section.units.map((u) => u.motor.id)),
      [['a1', 'a2'], ['b1']],
    );
    assert.equal(page.hasMore, true);
  });

  it('returns everything when the limit covers it', () => {
    const page = limitEngineSections(sections, 5);
    assert.equal(page.sections.length, 2);
    assert.equal(page.hasMore, false);
    assert.equal(limitEngineSections(sections, 2).sections.length, 1);
  });
});
