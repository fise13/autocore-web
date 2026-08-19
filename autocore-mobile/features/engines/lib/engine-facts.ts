/**
 * Engine card facts.
 *
 * The old card was five sections of `label → one line of muted text`. This
 * turns the same data into a few composed, glanceable units: what a person
 * actually asks about an engine is *where is it*, *what is it*, and *how long
 * has it sat*.
 *
 * Pure — no React, no Firestore.
 */
import { format } from 'date-fns';
import { enUS } from 'date-fns/locale';

import type { DocumentationChecklistSummary } from '@autocore/engine-intake';
// Relative, not `@/` — these run under the repo-root node test runner, where
// the `@/` alias points at the web app's src/.
import type { MotorEntity } from '../../../types/motor';

export type EngineFact = {
  id: string;
  label: string;
  value: string;
  /** Draws attention when the value is a problem rather than a datum. */
  tone?: 'default' | 'warning';
  /** Codes a person reads off a label — rendered in the identifier face. */
  mono?: boolean;
};

export type EngineSpecRow = EngineFact;

function clean(value: string | null | undefined): string | null {
  const trimmed = value?.trim();
  return trimmed ? trimmed : null;
}

/** Whole days on the lot — the number that decides whether it is stale stock. */
export function daysOnLot(motor: MotorEntity, now = new Date()): number | null {
  const arrival = motor.arrivalDate;
  if (!arrival) return null;
  const start = new Date(arrival.getFullYear(), arrival.getMonth(), arrival.getDate());
  const end = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const days = Math.floor((end.getTime() - start.getTime()) / 86_400_000);
  return days >= 0 ? days : null;
}

/**
 * Packing-slip rows for the object screen. Location always leads — it is the
 * one fact someone standing in the warehouse actually needs. Empty fields are
 * omitted rather than padded; an unplaced unit is a warning, not a blank.
 */
export function engineSpecRows(motor: MotorEntity, now = new Date()): EngineSpecRow[] {
  const rows: EngineSpecRow[] = [];

  const location = clean(motor.primaryLocationCode) ?? clean(motor.warehouseLocation);
  rows.push({
    id: 'location',
    label: 'Location',
    value: location ?? 'Unplaced',
    tone: location ? 'default' : 'warning',
    // A shelf code is read off a label; "Unplaced" is a sentence about one.
    mono: Boolean(location),
  });

  const configuration = clean(motor.configuration);
  if (configuration) {
    rows.push({ id: 'configuration', label: 'Configuration', value: configuration });
  }

  const transmission = clean(motor.transmission);
  if (transmission) {
    rows.push({ id: 'transmission', label: 'Transmission', value: transmission });
  }

  const days = daysOnLot(motor, now);
  if (days != null) {
    rows.push({
      id: 'age',
      label: 'On the lot',
      value: days === 0 ? 'Today' : `${days} ${days === 1 ? 'day' : 'days'}`,
    });
  } else if (motor.arrivalDate) {
    rows.push({
      id: 'arrived',
      label: 'Arrived',
      value: format(motor.arrivalDate, 'd MMM yyyy', { locale: enUS }),
    });
  }

  return rows;
}

/**
 * Three-cell glance strip. Prefer `engineSpecRows` on the object screen.
 */
export function engineFacts(motor: MotorEntity, now = new Date()): EngineFact[] {
  return engineSpecRows(motor, now).slice(0, 3);
}

export type DocumentationLine = {
  /** `14 of 18` — items settled versus items that still need an answer. */
  headline: string;
  detail: string;
  tone: 'success' | 'warning' | 'danger';
  /** 0–1, for the progress track. */
  ratio: number;
};

/**
 * Turns the intake checklist summary into one honest line. Deliberately no
 * percentage — `evidence-labels.ts` already established that a worker needs a
 * count and a name, not "67%".
 */
export function documentationLine(
  summary: DocumentationChecklistSummary | null | undefined,
): DocumentationLine | null {
  if (!summary) return null;

  const outstanding = summary.missingCount + summary.uncertainCount;
  const total = summary.completedCount + outstanding;
  if (total === 0) return null;

  const headline = `${summary.completedCount} of ${total}`;
  const ratio = summary.completedCount / total;

  if (summary.saleGateMissingCount > 0) {
    const n = summary.saleGateMissingCount;
    return {
      headline,
      detail: `${n} ${n === 1 ? 'shot blocks' : 'shots block'} sale`,
      tone: 'danger',
      ratio,
    };
  }

  if (outstanding > 0) {
    return {
      headline,
      detail:
        summary.uncertainCount > 0 && summary.missingCount === 0
          ? `${summary.uncertainCount} needs review`
          : `${summary.missingCount} still missing`,
      tone: 'warning',
      ratio,
    };
  }

  return { headline, detail: 'Documentation complete', tone: 'success', ratio: 1 };
}
