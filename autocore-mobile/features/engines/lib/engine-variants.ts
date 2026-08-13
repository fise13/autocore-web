/**
 * Engine catalog grouping.
 *
 * A yard holds many units of the same engine. Listing 248 flat rows makes the
 * catalog unreadable, so units are folded into *variants* — brand + engine code
 * — and the variant header carries the name and code while the rows underneath
 * stay minimal: a preview, the serial, and where it sits.
 *
 * Pure — no React, no Firestore.
 */
// Relative, not `@/` — these run under the repo-root node test runner, where
// the `@/` alias points at the web app's src/.
import { joinSearchFields, matchesSearchQuery } from '../../../lib/search/match-query';
import type { MotorEntity } from '../../../types/motor';

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

export function engineMatchesQuery(motor: MotorEntity, query: string): boolean {
  return matchesSearchQuery(
    joinSearchFields(
      motor.serialCode,
      motor.brandName,
      motor.engineCode,
      motor.configuration,
      motor.transmission,
      motor.primaryLocationCode,
      motor.warehouseLocation,
    ),
    query,
  );
}

function compareUnits(left: MotorEntity, right: MotorEntity): number {
  return engineUnitLabel(left).localeCompare(engineUnitLabel(right), undefined, {
    numeric: true,
    sensitivity: 'base',
  });
}

/**
 * Groups units into variants, biggest variant first so the stock a yard
 * actually has depth in leads. `unspecified` always sinks to the bottom — it is
 * a data-quality bucket, not a real variant.
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
  for (const variant of variants) variant.units.sort(compareUnits);

  return variants.sort((left, right) => {
    if (left.id === 'unspecified') return 1;
    if (right.id === 'unspecified') return -1;
    if (left.units.length !== right.units.length) return right.units.length - left.units.length;
    return left.title.localeCompare(right.title, undefined, { sensitivity: 'base' });
  });
}

export function variantSubtitle(variant: EngineVariant): string {
  const count = variant.units.length;
  const units = `${count} ${count === 1 ? 'unit' : 'units'}`;
  const placed = variant.units.filter((unit) => engineUnitLocation(unit)).length;
  if (placed === 0 || placed === count) return units;
  return `${units} · ${count - placed} unplaced`;
}
