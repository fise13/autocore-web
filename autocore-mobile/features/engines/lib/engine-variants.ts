/**
 * Engine catalog identity, status, and classification.
 *
 * The yard is filed by *motor* — brand + engine code — the same way a person
 * shouts across the warehouse: "2AZ-FE". Units sit under that heading so you
 * see every serial without losing the type.
 *
 * Pure — no React, no Firestore.
 */
// Relative, not `@/` — these run under the repo-root node test runner, where
// the `@/` alias points at the web app's src/.
import {
  compactAlphanumeric,
  joinSearchFields,
  normalizeSearchQuery,
} from '../../../lib/search/match-query';
import type { MotorEntity } from '../../../types/motor';

import {
  engineQualityGrade,
  engineQualityLabel,
  engineQualitySearchText,
  isExactQualityGradeQuery,
} from './engine-quality';

export type EngineVariant = {
  /** Stable list key. */
  id: string;
  /** `Toyota 2AZ-FE` — what the header shows. */
  title: string;
  brand: string | null;
  code: string | null;
  units: MotorEntity[];
};

function clean(value: string | null | undefined): string | null {
  const trimmed = value?.trim();
  return trimmed ? trimmed : null;
}

export function engineVariantKey(motor: MotorEntity): string {
  const brand = clean(motor.brandName)?.toLowerCase() ?? '';
  const code = clean(motor.engineCode)?.toLowerCase() ?? '';
  if (!brand && !code) return 'unspecified';
  return `${brand}|${code}`;
}

/** `Toyota 2AZ-FE`, falling back through code → configuration → a neutral label. */
export function engineVariantTitle(motor: MotorEntity): string {
  const parts = [clean(motor.brandName), clean(motor.engineCode)].filter(Boolean);
  if (parts.length > 0) return parts.join(' ');
  return clean(motor.configuration) ?? 'Unspecified engine';
}

/** Row identity — the serial is what a person reads off the block. */
export function engineUnitLabel(motor: MotorEntity): string {
  return clean(motor.serialCode) ?? `#${motor.localId ?? motor.id}`;
}

/** Where the unit physically is, or null when nobody has placed it. */
export function engineUnitLocation(motor: MotorEntity): string | null {
  return clean(motor.primaryLocationCode) ?? clean(motor.warehouseLocation);
}

export function engineThumbnailUrl(motor: MotorEntity): string | null {
  return motor.photoUrls?.find((url) => url.trim().length > 0) ?? null;
}

/** Tone key for the unit's status — resolved against the theme by the row. */
export type EngineStatusTone = 'success' | 'warning' | 'danger' | 'progress' | 'muted';

/**
 * Firestore stores raw enum values (`intake_in_progress`). A catalog row should
 * read like a sentence, not like a database column.
 */
export function engineStatusLabel(motor: MotorEntity): string {
  if (motor.soldDate) return 'Sold';
  switch (motor.status ?? 'available') {
    case 'draft':
      return 'Draft';
    case 'intake_in_progress':
      return 'In intake';
    case 'awaiting_verification':
      return 'Awaiting review';
    case 'quarantine':
      return 'Quarantined';
    case 'rejected':
      return 'Rejected';
    case 'reserved':
      return 'Reserved';
    case 'installed':
      return 'Installed';
    case 'sold':
      return 'Sold';
    default:
      return 'Available';
  }
}

export function engineStatusTone(motor: MotorEntity): EngineStatusTone {
  if (motor.soldDate) return 'muted';
  switch (motor.status ?? 'available') {
    case 'available':
      return 'success';
    case 'reserved':
      return 'warning';
    case 'quarantine':
    case 'rejected':
      return 'danger';
    case 'draft':
    case 'intake_in_progress':
    case 'awaiting_verification':
      return 'progress';
    default:
      return 'muted';
  }
}

type EngineSearchText = { lower: string; compact: string };

/** Motors are immutable snapshots, so a motor's searchable text is computed once. */
const searchTextCache = new WeakMap<MotorEntity, EngineSearchText>();

function engineSearchText(motor: MotorEntity): EngineSearchText {
  const cached = searchTextCache.get(motor);
  if (cached) return cached;
  const haystack = joinSearchFields(
    motor.serialCode,
    motor.brandName,
    motor.engineCode,
    motor.configuration,
    motor.transmission,
    motor.primaryLocationCode,
    motor.warehouseLocation,
    engineQualityLabel(motor),
    engineQualitySearchText(motor),
  );
  const text = { lower: haystack.toLowerCase(), compact: compactAlphanumeric(haystack) };
  searchTextCache.set(motor, text);
  return text;
}

/**
 * Fill the search-text cache for `motors[from, from + count)`; returns the next
 * index. The screen calls it in idle slices after opening, so the first
 * keystroke does not pay for 10,000 motors at once.
 */
export function primeEngineSearch(motors: readonly MotorEntity[], from: number, count: number): number {
  const end = Math.min(motors.length, from + count);
  for (let index = from; index < end; index += 1) engineSearchText(motors[index]!);
  return end;
}

/**
 * Build the matcher once per query, then test each motor against cached text.
 * Same rules as `matchesSearchQuery` (multi-token AND, serial/VIN compaction),
 * without re-normalising the query and re-lowercasing every motor per keystroke.
 */
export function createEngineQueryMatcher(query: string): (motor: MotorEntity) => boolean {
  const normalized = normalizeSearchQuery(query);
  if (!normalized) return () => false;
  const tokens = normalized.split(' ').filter(Boolean);
  const compactTokens = tokens.map(compactAlphanumeric);
  const compactQuery = compactAlphanumeric(query);
  const exactGrade = isExactQualityGradeQuery(query);

  return (motor) => {
    if (exactGrade && engineQualityGrade(motor) === exactGrade) return true;
    const text = engineSearchText(motor);
    if (compactQuery.length >= 4 && text.compact.includes(compactQuery)) return true;
    return tokens.every(
      (token, index) =>
        text.lower.includes(token) ||
        (compactTokens[index]!.length >= 3 && text.compact.includes(compactTokens[index]!)),
    );
  };
}

export function engineMatchesQuery(motor: MotorEntity, query: string): boolean {
  return createEngineQueryMatcher(query)(motor);
}

/**
 * One collator each, built once. `localeCompare(…, options)` sets up a collator
 * on every call; sorting 10,000 serials that way cost ~170 ms in V8 and several
 * times that in Hermes, every time the yard was regrouped.
 */
const serialCollator = new Intl.Collator(undefined, { numeric: true, sensitivity: 'base' });
const titleCollator = new Intl.Collator(undefined, { sensitivity: 'base' });

function compareUnits(left: MotorEntity, right: MotorEntity): number {
  return serialCollator.compare(engineUnitLabel(left), engineUnitLabel(right));
}

/** Natural serial order, with each label computed once rather than per comparison. */
function sortUnits(units: MotorEntity[]): MotorEntity[] {
  const keyed = units.map((motor) => ({ label: engineUnitLabel(motor), motor }));
  keyed.sort((left, right) => serialCollator.compare(left.label, right.label));
  return keyed.map((entry) => entry.motor);
}

/**
 * Flat catalog order: same variant (brand + code) stays together, serials
 * natural-sorted inside the group so a yard of 2AZ-FEs reads as a run.
 */
export function sortEnginesForCatalog(motors: MotorEntity[]): MotorEntity[] {
  return [...motors].sort((left, right) => {
    const byVariant = titleCollator.compare(engineVariantTitle(left), engineVariantTitle(right));
    if (byVariant !== 0) return byVariant;
    return compareUnits(left, right);
  });
}

/**
 * Groups units into motors, biggest type first so the stock a yard
 * actually has depth in leads. `unspecified` always sinks to the bottom — it is
 * a data-quality bucket, not a real motor.
 */
export function groupEnginesByVariant(motors: MotorEntity[]): EngineVariant[] {
  const map = new Map<string, EngineVariant>();

  for (const motor of motors) {
    const id = engineVariantKey(motor);
    const existing = map.get(id);
    if (existing) {
      existing.units.push(motor);
      continue;
    }
    map.set(id, {
      id,
      title: engineVariantTitle(motor),
      brand: clean(motor.brandName),
      code: clean(motor.engineCode),
      units: [motor],
    });
  }

  const variants = Array.from(map.values());
  for (const variant of variants) variant.units = sortUnits(variant.units);

  return variants.sort((left, right) => {
    if (left.id === 'unspecified') return 1;
    if (right.id === 'unspecified') return -1;
    if (left.units.length !== right.units.length) return right.units.length - left.units.length;
    return titleCollator.compare(left.title, right.title);
  });
}

export function variantSubtitle(variant: EngineVariant): string {
  // Just the count: a header has one line, and unshelved units already say so
  // on their own rows in the warning colour.
  return variant.units.length.toLocaleString('en-US');
}

/** Brand is the kicker; the code is what the yard actually files under. */
export function variantHeading(variant: EngineVariant): { kicker: string | null; title: string } {
  if (variant.brand && variant.code) return { kicker: variant.brand, title: variant.code };
  return { kicker: null, title: variant.title };
}
