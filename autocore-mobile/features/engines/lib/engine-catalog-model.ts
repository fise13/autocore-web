import type { EngineIntakeJob } from '@autocore/engine-intake';

import type { MotorEntity } from '../../../types/motor';

import type { EngineListFilter } from './engine-lane';
import type { EngineRow, EngineRowPosition } from './engine-list-sections';
import { engineMatchesQualityFilter, type EngineQualityFilter } from './engine-quality';
import { splitEngineCatalog } from './motor-from-intake-job';
import {
  createEngineQueryMatcher,
  engineUnitLocation,
  groupEnginesByVariant,
  variantHeading,
  variantSubtitle,
  type EngineVariant,
} from './engine-variants';

/**
 * Everything the Engines screen derives from the catalog, in one pure pass.
 *
 * It used to live in the screen's `useMemo`s, so every visit to Engines rebuilt
 * the whole yard from scratch — leaving and coming back paid full price even
 * when nothing had changed. The last result is kept at module level and reused
 * while the motors, jobs and filters are the same objects, so reopening the tab
 * costs nothing. Pure — the node test runner loads it.
 */

export type EngineCatalogInput = {
  jobs: readonly EngineIntakeJob[];
  /** Pass `[]` when the viewer cannot browse the catalog. */
  motors: readonly MotorEntity[];
  query: string;
  quality: EngineQualityFilter;
  lane: EngineListFilter;
};

export type EngineCatalogModel = {
  rows: EngineRow[];
  incomingTotal: number;
  incomingCount: number;
  yardCount: number;
  unplacedCount: number;
};

function rowPosition(index: number, total: number): EngineRowPosition {
  if (total <= 1) return 'only';
  if (index === 0) return 'first';
  if (index === total - 1) return 'last';
  return 'middle';
}

function plural(count: number, one: string, many: string): string {
  return `${count.toLocaleString('en-US')} ${count === 1 ? one : many}`;
}

function variantRows(variants: EngineVariant[]): EngineRow[] {
  const rows: EngineRow[] = [];
  for (const variant of variants) {
    const heading = variantHeading(variant);
    rows.push({
      type: 'header',
      key: `h:yard:${variant.id}`,
      kicker: heading.kicker ?? undefined,
      title: heading.title,
      meta: variantSubtitle(variant),
    });
    variant.units.forEach((motor, index) => {
      rows.push({
        type: 'unit',
        key: `u:yard:${variant.id}:${motor.id}`,
        motor,
        lane: 'yard',
        position: rowPosition(index, variant.units.length),
      });
    });
  }
  return rows;
}

function incomingRows(motors: MotorEntity[]): EngineRow[] {
  return motors.map((motor, index) => ({
    type: 'unit' as const,
    key: `u:incoming:${motor.intakeJobId ?? motor.id}`,
    motor,
    lane: 'incoming' as const,
    position: rowPosition(index, motors.length),
  }));
}

export function buildEngineCatalog(input: EngineCatalogInput): EngineCatalogModel {
  const { incoming, yard } = splitEngineCatalog(input.jobs, input.motors);
  const match = input.query ? createEngineQueryMatcher(input.query) : null;

  const incomingMatched = match ? incoming.filter(match) : incoming;
  // Incoming has no grade yet, so the grade filter only ever narrows the yard.
  const yardMatched =
    match || input.quality !== 'all'
      ? yard.filter(
          (motor) => engineMatchesQualityFilter(motor, input.quality) && (!match || match(motor)),
        )
      : yard;

  let rows: EngineRow[];
  if (input.lane === 'incoming') {
    rows = incomingRows(incomingMatched);
  } else {
    const yardRows = variantRows(groupEnginesByVariant(yardMatched));
    rows =
      input.lane === 'yard' || incomingMatched.length === 0
        ? yardRows
        : [
            {
              type: 'header',
              key: 'h:incoming',
              title: 'Incoming',
              meta: plural(incomingMatched.length, 'engine', 'engines'),
            },
            ...incomingRows(incomingMatched),
            ...yardRows,
          ];
  }

  let unplacedCount = 0;
  for (const motor of yardMatched) if (!engineUnitLocation(motor)) unplacedCount += 1;

  return {
    rows,
    incomingTotal: incoming.length,
    incomingCount: incomingMatched.length,
    yardCount: yardMatched.length,
    unplacedCount,
  };
}

let last: { input: EngineCatalogInput; model: EngineCatalogModel } | null = null;

/** Above this many intake jobs, compare by reference rather than content. */
const JOB_SIGNATURE_LIMIT = 300;
const jobSignatures = new WeakMap<readonly EngineIntakeJob[], string>();

function jobsSignature(jobs: readonly EngineIntakeJob[]): string | null {
  if (jobs.length > JOB_SIGNATURE_LIMIT) return null;
  let signature = jobSignatures.get(jobs);
  if (signature === undefined) {
    signature = JSON.stringify(jobs);
    jobSignatures.set(jobs, signature);
  }
  return signature;
}

/**
 * The intake hook re-reads its jobs from disk on every mount, so the array is
 * new each visit even when nothing changed — comparing it by reference made
 * every reopen of Engines rebuild the whole catalog. A yard's open intake jobs
 * are few, so compare them by content.
 */
function sameJobs(left: readonly EngineIntakeJob[], right: readonly EngineIntakeJob[]): boolean {
  if (left === right) return true;
  if (left.length !== right.length) return false;
  const signature = jobsSignature(left);
  return signature !== null && signature === jobsSignature(right);
}

function sameInput(left: EngineCatalogInput, right: EngineCatalogInput): boolean {
  return (
    sameJobs(left.jobs, right.jobs) &&
    left.motors === right.motors &&
    left.query === right.query &&
    left.quality === right.quality &&
    left.lane === right.lane
  );
}

/** `buildEngineCatalog`, reused across visits while its inputs are unchanged. */
export function deriveEngineCatalog(input: EngineCatalogInput): EngineCatalogModel {
  if (last && sameInput(last.input, input)) return last.model;
  const model = buildEngineCatalog(input);
  last = { input, model };
  return model;
}
