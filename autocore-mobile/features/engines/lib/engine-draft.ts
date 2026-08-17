/**
 * Validation for a new serialized engine.
 *
 * The serial is the unit's identity — it is what a person reads off the block
 * and what every later movement, sale and document refers to. Two units with
 * the same serial cannot be told apart afterwards, so the composer checks the
 * catalog before it writes rather than leaving the yard to discover it later.
 *
 * Two levels, deliberately different in strength:
 *  - an **exact** collision (same characters, ignoring case and spacing) is a
 *    duplicate and blocks the save;
 *  - a **near** collision (same characters once separators are dropped) is only
 *    a warning — `2AZ-1234567` and `2AZ1234567` are usually the same engine
 *    typed twice, but they are legitimately different often enough that
 *    refusing the save would be wrong.
 *
 * Pure — no React, no Firestore.
 */
// Relative, not `@/` — these run under the repo-root node test runner, where
// the `@/` alias points at the web app's src/.
import type { MotorEntity } from '../../../types/motor';

export type EngineDraft = {
  serial: string;
  brand: string;
  code: string;
  location: string;
};

export function emptyEngineDraft(): EngineDraft {
  return { serial: '', brand: '', code: '', location: '' };
}

/** Case and spacing are typing noise; everything else is part of the serial. */
export function exactSerialKey(serial: string): string {
  return serial.trim().replace(/\s+/g, ' ').toUpperCase();
}

/** Drops separators too, so `2AZ-123` and `2AZ 123` collide. */
export function nearSerialKey(serial: string): string {
  return serial.toUpperCase().replace(/[^A-Z0-9]/g, '');
}

export type EngineDraftCheck =
  | { status: 'incomplete' }
  | { status: 'duplicate'; existing: MotorEntity }
  | { status: 'similar'; existing: MotorEntity }
  | { status: 'ok' };

/**
 * `motors` is the catalog already in memory from the realtime listener, so this
 * costs nothing and needs no extra read.
 */
export function checkEngineDraft(draft: EngineDraft, motors: MotorEntity[]): EngineDraftCheck {
  const serial = draft.serial.trim();
  if (!serial) return { status: 'incomplete' };

  const exact = exactSerialKey(serial);
  const near = nearSerialKey(serial);
  let similar: MotorEntity | null = null;

  for (const motor of motors) {
    const candidate = motor.serialCode?.trim();
    if (!candidate) continue;
    if (exactSerialKey(candidate) === exact) {
      return { status: 'duplicate', existing: motor };
    }
    // Keep looking — an exact match anywhere outranks a near one.
    if (!similar && near && nearSerialKey(candidate) === near) {
      similar = motor;
    }
  }

  if (similar) return { status: 'similar', existing: similar };
  return { status: 'ok' };
}

/** Only a blocking verdict stops the save; a near match is the user's call. */
export function canSaveEngineDraft(check: EngineDraftCheck): boolean {
  return check.status === 'ok' || check.status === 'similar';
}

export type EngineCreateInput = {
  serialCode: string;
  brandName?: string;
  engineCode?: string;
  warehouseLocation?: string;
};

/** Draft → repository input. Blank optional fields are omitted, not sent empty. */
export function toEngineCreateInput(draft: EngineDraft): EngineCreateInput {
  const trimmed = (value: string) => {
    const next = value.trim();
    return next ? next : undefined;
  };

  return {
    serialCode: draft.serial.trim().replace(/\s+/g, ' '),
    brandName: trimmed(draft.brand),
    engineCode: trimmed(draft.code),
    warehouseLocation: trimmed(draft.location),
  };
}

/**
 * What the composer says it is about to file, so the variant it lands under is
 * visible before the save rather than a surprise in the list afterwards.
 */
export function draftVariantLabel(draft: EngineDraft): string {
  const parts = [draft.brand.trim(), draft.code.trim()].filter(Boolean);
  return parts.length > 0 ? parts.join(' ') : 'Unspecified engine';
}
