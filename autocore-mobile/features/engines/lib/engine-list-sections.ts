import type { MotorEntity } from '../../../types/motor';

/**
 * The Engines list as a flat row stream, and as the sections a native list wants.
 *
 * React Native's `FlashList` and SwiftUI's `List` disagree about shape: one
 * takes a flat array with header rows mixed in, the other takes `Section`s that
 * own their children. Rather than let the two renderers each invent a grouping,
 * the screen builds the flat stream once and this turns it into sections for
 * whichever renderer needs them.
 *
 * Pure — no React Native — so the node test runner can load it.
 */

export type EngineListLane = 'incoming' | 'yard';

export type EngineRowPosition = 'first' | 'middle' | 'last' | 'only';

export type EngineRow =
  | { type: 'header'; key: string; kicker?: string; title: string; meta: string }
  | {
      type: 'unit';
      key: string;
      motor: MotorEntity;
      lane: EngineListLane;
      position: EngineRowPosition;
    };

export type EngineUnitRow = Extract<EngineRow, { type: 'unit' }>;

export type EngineListSection = {
  key: string;
  /** Absent for units that appear before any heading — Incoming has none. */
  title: string | null;
  kicker: string | null;
  meta: string | null;
  units: EngineUnitRow[];
};

/**
 * Group the flat stream under its headings.
 *
 * Units that arrive before the first header form an untitled leading section:
 * that is the Incoming lane, which is deliberately headingless when shown on
 * its own and gains an "Incoming" header only in the combined view. Dropping
 * those rows because no header preceded them would silently empty the bay.
 */
export function groupEngineRowsIntoSections(
  rows: readonly EngineRow[],
): EngineListSection[] {
  const sections: EngineListSection[] = [];
  let current: EngineListSection | null = null;

  for (const row of rows) {
    if (row.type === 'header') {
      current = {
        key: row.key,
        title: row.title,
        kicker: row.kicker ?? null,
        meta: row.meta,
        units: [],
      };
      sections.push(current);
      continue;
    }
    if (!current) {
      current = { key: `lead:${row.key}`, title: null, kicker: null, meta: null, units: [] };
      sections.push(current);
    }
    current.units.push(row);
  }

  // A heading with nothing under it is a filter artefact, not a group.
  return sections.filter((section) => section.units.length > 0);
}
