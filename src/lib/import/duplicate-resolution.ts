import type { CanonicalField } from "./types";

/**
 * Deciding what happens to each row of a duplicate group.
 *
 * Two things were wrong, and both produced the duplicates the import was
 * supposed to prevent:
 *
 *  - `update` — the default — committed **every** row in the group with
 *    `updateExisting: true`. Three repeats of one engine meant three writes,
 *    and when nothing matched in the database yet, three records.
 *  - `skip` dropped every row in the group, so choosing "Пропустить" on a pair
 *    of repeats lost the record entirely rather than keeping one of them.
 *
 * Neither ever distinguished the first row from its repeats. That is the whole
 * job, so it lives here as a pure decision with the reasoning attached.
 *
 * A second trap this guards: now that engines are named after the product
 * (`Subaru EJ253`) rather than the unit, every EJ253 on a sheet shares a name.
 * Grouping on `name` would collapse a hundred distinct engines into one. So a
 * row that carries its own identity — a serial, a VIN, an SKU — is never
 * grouped by name.
 *
 * Pure — no React, no Firestore.
 */

export type DuplicateResolution = "update" | "skip" | "create";

export type DuplicateGroupLike = {
  field: CanonicalField;
  rowIds: string[];
  resolution: DuplicateResolution;
};

export type RowAction = {
  /** Skip the row entirely — do not write anything for it. */
  skip: boolean;
  /** Write it against the existing record rather than creating a new one. */
  updateExisting: boolean;
};

/** Identity fields — a row carrying any of these is its own record. */
export const IDENTITY_FIELDS: CanonicalField[] = ["serial", "vin", "sku"];

/** Fields worth grouping on, strongest identity first. */
export const DUPLICATE_FIELDS: CanonicalField[] = ["serial", "vin", "sku", "name"];

export function duplicateKey(value: string): string {
  return value.trim().toLowerCase();
}

export type DuplicateCandidateRow = {
  id: string;
  values: Partial<Record<CanonicalField, string>>;
};

function hasOwnIdentity(row: DuplicateCandidateRow): boolean {
  return IDENTITY_FIELDS.some((field) => (row.values[field] ?? "").trim().length > 0);
}

/**
 * Group rows that repeat within the imported file.
 *
 * Only the strongest field that finds anything is reported: if serials repeat,
 * that is the story, and re-reporting the same rows under `name` would ask the
 * person the same question twice.
 */
export function buildDuplicateGroups(
  rows: readonly DuplicateCandidateRow[],
): Array<{ field: CanonicalField; value: string; rowIds: string[] }> {
  for (const field of DUPLICATE_FIELDS) {
    const byValue = new Map<string, { value: string; rowIds: string[] }>();
    for (const row of rows) {
      // A row with its own serial is not a duplicate of another engine just
      // because both are called "Subaru EJ253".
      if (field === "name" && hasOwnIdentity(row)) continue;
      const raw = row.values[field];
      if (!raw) continue;
      const key = duplicateKey(raw);
      if (!key) continue;
      const bucket = byValue.get(key) ?? { value: raw, rowIds: [] };
      bucket.rowIds.push(row.id);
      byValue.set(key, bucket);
    }

    const groups = [...byValue.values()]
      .filter((bucket) => bucket.rowIds.length > 1)
      .map((bucket) => ({ field, value: bucket.value, rowIds: bucket.rowIds }));
    if (groups.length > 0) return groups;
  }
  return [];
}

/** How many rows would be dropped if every group keeps only its first row. */
export function countDuplicateRows(
  groups: readonly { rowIds: string[] }[],
): number {
  return groups.reduce((sum, group) => sum + Math.max(0, group.rowIds.length - 1), 0);
}

/**
 * What to do with one row, given the groups it belongs to.
 *
 * `update` keeps the first row of the group and drops its repeats — one
 * record, carrying the first row's values. `create` keeps them all as separate
 * records. `skip` drops the whole group and leaves the database untouched.
 */
export function resolveRowAction(
  rowId: string,
  groups: readonly DuplicateGroupLike[],
): RowAction {
  let action: RowAction = { skip: false, updateExisting: false };

  for (const group of groups) {
    const position = group.rowIds.indexOf(rowId);
    if (position < 0) continue;

    if (group.resolution === "skip") {
      // An explicit "don't import this" wins over everything else.
      return { skip: true, updateExisting: false };
    }

    if (group.resolution === "create") continue;

    // update: the first row stands for the group, the repeats are dropped.
    if (position > 0) return { skip: true, updateExisting: false };
    action = { skip: false, updateExisting: true };
  }

  return action;
}
