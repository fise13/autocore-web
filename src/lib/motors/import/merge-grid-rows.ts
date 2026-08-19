import { joinGridFragments } from "@/lib/import/ai-grid-contract";

import { compactQualifierFragments } from "./qualifiers";

import { MotorImportPreviewRow } from "./types";

/**
 * One engine, many sheets.
 *
 * A dismantling workbook is not a list of engines — it is a list of *events*. The same
 * serial appears on its family tab, again on «СВЕРДЛОВА» when it moved, again on «ВОЗВРАТ»
 * when it came back, and again on «ПРОДАННЫЕ» when it sold. In the MOTOR LAND workbook
 * 1 200+ of the 4 300 rows are re-appearances: importing them row-by-row would create that
 * many duplicate motors, each holding a fragment of the truth.
 *
 * Merging by serial turns the events back into one engine with a complete history:
 * the stock tab supplies identity, the movement tabs supply configuration and dates.
 */

/** Serials are written with stray spaces and dashes; only the characters matter. */
export function serialMergeKey(serialCode: string): string {
  return serialCode.replace(/[^A-Za-z0-9]/g, "").toUpperCase();
}

function earliest(a: Date | null, b: Date | null): Date | null {
  if (!a) return b;
  if (!b) return a;
  return a.getTime() <= b.getTime() ? a : b;
}

function latest(a: Date | null, b: Date | null): Date | null {
  if (!a) return b;
  if (!b) return a;
  return a.getTime() >= b.getTime() ? a : b;
}

/**
 * How much a row can be trusted to describe the engine itself rather than a movement.
 * A stock tab row (brand + engine + arrival date, no operational qualifier) wins.
 */
function identityScore(row: MotorImportPreviewRow): number {
  let score = 0;
  if (row.brandName) score += 3;
  if (row.engineCode) score += 3;
  if (row.arrivalDate) score += 2;
  if (!row.configuration) score += 1;
  if (row.quantity > 1) score += 1;
  return score;
}

function mergeInto(
  primary: MotorImportPreviewRow,
  secondary: MotorImportPreviewRow,
): MotorImportPreviewRow {
  const mergedFrom = [
    ...(primary.mergedFrom ?? []),
    ...(secondary.mergedFrom ?? []),
    {
      sheetConfigId: secondary.sheetConfigId,
      sheetName: secondary.sheetName,
      rowKey: secondary.rowKey,
    },
  ];

  return {
    ...primary,
    brandName: primary.brandName || secondary.brandName,
    engineCode: primary.engineCode || secondary.engineCode,
    configuration: compactQualifierFragments(
      joinGridFragments([primary.configuration, secondary.configuration]),
    ),
    notes: joinGridFragments([primary.notes, secondary.notes]),
    quality: primary.quality || secondary.quality,
    quantity: Math.max(primary.quantity, secondary.quantity),
    transmission: primary.transmission || secondary.transmission,
    warehouseLocation: primary.warehouseLocation || secondary.warehouseLocation,
    arrivalDate: earliest(primary.arrivalDate, secondary.arrivalDate),
    soldDate: latest(primary.soldDate ?? null, secondary.soldDate ?? null),
    rawRowCells: joinGridFragments([primary.rawRowCells, secondary.rawRowCells]).slice(0, 960),
    warnings: [...new Set([...primary.warnings, ...secondary.warnings])],
    rowWarnings: [...new Set([...(primary.rowWarnings ?? []), ...(secondary.rowWarnings ?? [])])],
    mergedFrom,
  };
}

export type MotorRowMergeResult = {
  rows: MotorImportPreviewRow[];
  /** How many source rows were folded into an earlier row. */
  absorbed: number;
};

/**
 * Fold rows that share a serial into a single grid row.
 *
 * Rows without a serial are never merged — an unknown number is not evidence that two
 * engines are the same one.
 */
export function mergeMotorRowsBySerial(rows: MotorImportPreviewRow[]): MotorRowMergeResult {
  const byKey = new Map<string, number>();
  const output: MotorImportPreviewRow[] = [];
  let absorbed = 0;

  for (const row of rows) {
    const key = serialMergeKey(row.serialCode);
    if (!key) {
      output.push(row);
      continue;
    }

    const existingIndex = byKey.get(key);
    if (existingIndex == null) {
      byKey.set(key, output.length);
      output.push(row);
      continue;
    }

    const existing = output[existingIndex];
    const keepExistingAsPrimary = identityScore(existing) >= identityScore(row);
    output[existingIndex] = keepExistingAsPrimary
      ? mergeInto(existing, row)
      : mergeInto(row, existing);
    absorbed += 1;
  }

  const withNotice = output.map((row) => {
    if (!row.mergedFrom?.length) return row;
    const sheets = [...new Set(row.mergedFrom.map((entry) => entry.sheetName))];
    return {
      ...row,
      warnings: [...new Set([...row.warnings, `Объединено с листами: ${sheets.join(", ")}`])],
    };
  });

  return { rows: withNotice, absorbed };
}

/** Sheets whose rows survive the merge, either directly or inside a merged row. */
export function representedSheetConfigIds(rows: MotorImportPreviewRow[]): Set<string> {
  const ids = new Set<string>();
  for (const row of rows) {
    ids.add(row.sheetConfigId);
    for (const entry of row.mergedFrom ?? []) ids.add(entry.sheetConfigId);
  }
  return ids;
}
