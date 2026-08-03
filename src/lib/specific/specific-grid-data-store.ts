import { SpecificColumnDef } from "@/domain/specific-category";
import { SpecificRecordEntity } from "@/infrastructure/firestore/specific-category-repository";

import { nextEmptyRowId } from "@/lib/grid/empty-row-id";
import {
  applySpecificSlotValue,
  buildSpecificHeaderMapping,
  specificValueForSlot,
  SpecificHeaderMapping,
} from "@/lib/specific/specific-header-mapping";
import {
  SPECIFIC_PHOTO_URLS_KEY,
  SPECIFIC_QUALITY_KEY,
} from "@/lib/specific/specific-photo-quality";
import { buildSpecificColumnKeys } from "@/lib/specific/specific-table";

export type SpecificGridRow =
  | (SpecificRecordEntity & {
      rowKind: "saved";
      rowId: string;
    })
  | {
      rowKind: "empty";
      rowId: string;
      rowIndex: number;
      data: Record<string, string>;
    };

export function createEmptySpecificRow(rowIndex: number): SpecificGridRow {
  return {
    rowKind: "empty",
    rowId: nextEmptyRowId(),
    rowIndex,
    data: {},
  };
}

function injectedColumnKey(schemaLength: number, column: number): string | null {
  if (column === schemaLength + 1) return SPECIFIC_QUALITY_KEY;
  if (column === schemaLength + 2) return SPECIFIC_PHOTO_URLS_KEY;
  return null;
}

export function specificCellValue(
  row: SpecificGridRow,
  column: number,
  mapping: SpecificHeaderMapping,
  schema?: SpecificColumnDef[],
): string {
  if (column === 0) return String(row.rowIndex || "");
  if (schema?.length) {
    const colDef = schema[column - 1];
    if (colDef) return row.data[colDef.key] ?? "";
    const injected = injectedColumnKey(schema.length, column);
    if (injected === SPECIFIC_PHOTO_URLS_KEY) return "";
    if (injected) return row.data[injected] ?? "";
    return "";
  }
  if (column >= 1 && column <= 7) {
    return specificValueForSlot(row.data, mapping, column - 1);
  }
  return "";
}

export function applySpecificCellValue(
  row: SpecificGridRow,
  column: number,
  value: string,
  mapping: SpecificHeaderMapping,
  schema?: SpecificColumnDef[],
): SpecificGridRow {
  if (column === 0) return row;
  if (schema?.length) {
    const colDef = schema[column - 1];
    if (colDef) {
      if (colDef.editable === false) return row;
      const nextData = { ...row.data, [colDef.key]: value };
      if (row.rowKind === "saved") return { ...row, data: nextData };
      return { ...row, data: nextData };
    }
    const injected = injectedColumnKey(schema.length, column);
    if (!injected || injected === SPECIFIC_PHOTO_URLS_KEY) return row;
    const nextData = { ...row.data, [injected]: value };
    if (row.rowKind === "saved") return { ...row, data: nextData };
    return { ...row, data: nextData };
  }
  if (column > 6) return row;
  const nextData = applySpecificSlotValue(row.data, mapping, column - 1, value);
  if (row.rowKind === "saved") {
    return { ...row, data: nextData };
  }
  return { ...row, data: nextData };
}

export function hasSpecificRowContent(
  row: SpecificGridRow,
  mapping: SpecificHeaderMapping = buildSpecificHeaderMapping([]),
  schema?: SpecificColumnDef[],
): boolean {
  if (schema?.length) {
    for (const column of schema) {
      if ((row.data[column.key] ?? "").trim()) return true;
    }
    if ((row.data[SPECIFIC_QUALITY_KEY] ?? "").trim()) return true;
    if ((row.data[SPECIFIC_PHOTO_URLS_KEY] ?? "").trim()) return true;
    return false;
  }
  return hasSpecificMappedContent(row, mapping);
}

export function hasSpecificMappedContent(
  row: SpecificGridRow,
  mapping: SpecificHeaderMapping = buildSpecificHeaderMapping([]),
): boolean {
  for (let slot = 0; slot < 7; slot += 1) {
    if (specificValueForSlot(row.data, mapping, slot).trim()) return true;
  }
  return false;
}

export function buildSpecificGridRows(
  records: SpecificRecordEntity[],
  emptyRows = 40,
): SpecificGridRow[] {
  const seenRecordIds = new Set<string>();
  const saved: SpecificGridRow[] = [];
  for (const record of records) {
    if (seenRecordIds.has(record.id)) continue;
    seenRecordIds.add(record.id);
    saved.push({
      ...record,
      rowKind: "saved",
      rowId: `saved-${record.id}`,
    });
  }

  const maxRowIndex = saved.reduce((acc, row) => Math.max(acc, row.rowIndex), 0);
  const nextRows: SpecificGridRow[] = [...saved];
  for (let index = 0; index < emptyRows; index += 1) {
    nextRows.push(createEmptySpecificRow(maxRowIndex + index + 1));
  }
  return nextRows;
}

export function growSpecificRows(rows: SpecificGridRow[], growBy: number): SpecificGridRow[] {
  const maxRowIndex = rows.reduce((acc, row) => Math.max(acc, row.rowIndex), 0);
  const next = [...rows];
  for (let index = 0; index < growBy; index += 1) {
    next.push(createEmptySpecificRow(maxRowIndex + index + 1));
  }
  return next;
}

export function buildSavedSpecificRowFromUpsert(
  row: SpecificGridRow & { rowKind: "empty" },
  recordId: string,
  companyId: string,
  categoryId: string,
  categoryLocalId: number,
): SpecificGridRow & { rowKind: "saved" } {
  return {
    id: recordId,
    companyId,
    categoryId,
    categoryLocalId,
    rowIndex: row.rowIndex,
    data: { ...row.data },
    rowKind: "saved",
    rowId: `saved-${recordId}`,
  };
}

function emptyRowConflictsWithSaved(
  row: SpecificGridRow & { rowKind: "empty" },
  saved: SpecificGridRow[],
): boolean {
  return saved.some(
    (savedRow) => savedRow.rowKind === "saved" && savedRow.rowIndex === row.rowIndex,
  );
}

export function reconcileSpecificRowsWithRemote(
  currentRows: SpecificGridRow[],
  incomingRecords: SpecificRecordEntity[],
  dirtyRowIds: Set<string>,
): SpecificGridRow[] {
  const currentSavedById = new Map(
    currentRows
      .filter((row): row is SpecificGridRow & { rowKind: "saved" } => row.rowKind === "saved")
      .map((row) => [row.id, row]),
  );

  const saved: SpecificGridRow[] = [];
  const seenRecordIds = new Set<string>();
  for (const record of incomingRecords) {
    if (seenRecordIds.has(record.id)) continue;
    seenRecordIds.add(record.id);
    const rowId = `saved-${record.id}`;
    if (dirtyRowIds.has(rowId)) {
      const preserved = currentSavedById.get(record.id);
      if (preserved) {
        saved.push(preserved);
        continue;
      }
    }
    saved.push({
      ...record,
      rowKind: "saved",
      rowId,
    });
  }

  const dirtyDraftRows = currentRows.filter((row) => {
    if (row.rowKind !== "empty" || !dirtyRowIds.has(row.rowId)) return false;
    return !emptyRowConflictsWithSaved(row, saved);
  });
  const preservedEmptyRows = currentRows.filter((row) => {
    if (row.rowKind !== "empty" || dirtyRowIds.has(row.rowId)) return false;
    return !emptyRowConflictsWithSaved(row, saved);
  });

  const targetCount = Math.max(currentRows.length, saved.length + dirtyDraftRows.length, 40);
  const nextRows: SpecificGridRow[] = [...saved, ...dirtyDraftRows];
  for (const row of preservedEmptyRows) {
    if (nextRows.length >= targetCount) break;
    nextRows.push(row);
  }
  while (nextRows.length < targetCount) {
    const maxRowIndex = nextRows.reduce((acc, row) => Math.max(acc, row.rowIndex), 0);
    nextRows.push(createEmptySpecificRow(maxRowIndex + 1));
  }

  return nextRows;
}

export function buildColumnOrderMetadata(columnKeys: string[]): Record<string, string> {
  return {
    _columnOrder: JSON.stringify(columnKeys),
  };
}

function pseudoRecordsFromRows(rows: SpecificGridRow[]): SpecificRecordEntity[] {
  return rows.map((row) => ({
    id: row.rowId,
    categoryId: "",
    categoryLocalId: 0,
    rowIndex: row.rowIndex,
    data: row.rowKind === "saved" ? row.data : row.data,
    companyId: "",
  }));
}

export function extractColumnKeysFromRows(rows: SpecificGridRow[]): string[] {
  return buildSpecificColumnKeys(pseudoRecordsFromRows(rows));
}

export function mergeSpecificColumnKeys(
  records: SpecificRecordEntity[],
  rows: SpecificGridRow[],
  extraKeys: string[] = [],
): string[] {
  const merged = [...buildSpecificColumnKeys(records)];
  for (const key of [...extractColumnKeysFromRows(rows), ...extraKeys]) {
    if (!merged.includes(key)) merged.push(key);
  }
  return merged;
}

export function renameSpecificColumnKey(
  rows: SpecificGridRow[],
  oldKey: string,
  newKey: string,
): SpecificGridRow[] {
  const trimmed = newKey.trim();
  if (!trimmed || oldKey === trimmed) return rows;

  return rows.map((row) => {
    if (!(oldKey in row.data)) return row;
    const nextData = { ...row.data };
    const existingValue = nextData[oldKey] ?? "";
    delete nextData[oldKey];
    nextData[trimmed] = existingValue;
    if (row.rowKind === "saved") {
      return { ...row, data: nextData };
    }
    return { ...row, data: nextData };
  });
}

export function appendSpecificColumnKey(rows: SpecificGridRow[], columnKey: string): SpecificGridRow[] {
  const trimmed = columnKey.trim();
  if (!trimmed) return rows;
  return rows.map((row) => ({
    ...row,
    data: row.data[trimmed] == null ? { ...row.data, [trimmed]: "" } : row.data,
  }));
}
