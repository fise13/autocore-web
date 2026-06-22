import {
  SpecificCategoryEntity,
  SpecificColumnDef,
  SpecificColumnKind,
  SpecificRecordEntity,
} from "@/domain/specific-category";
import {
  SPECIFIC_CANONICAL_TITLES,
  SPECIFIC_SOLD_DATE_KEY,
  SPECIFIC_SLOT_COUNT,
  buildSpecificHeaderMapping,
} from "@/lib/specific/specific-header-mapping";
import { buildSpecificColumnKeys } from "@/lib/specific/specific-table";

function newColumnId(): string {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return crypto.randomUUID();
  }
  return `col_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;
}

export function slugifyColumnKey(title: string, existingKeys: string[]): string {
  const base = title
    .trim()
    .normalize("NFD")
    .replace(/\p{M}/gu, "")
    .replace(/[^\p{L}\p{N}]+/gu, "_")
    .replace(/^_+|_+$/g, "")
    .toLowerCase();

  const normalized = base || "column";
  let candidate = normalized;
  let index = 2;
  while (existingKeys.includes(candidate)) {
    candidate = `${normalized}_${index}`;
    index += 1;
  }
  return candidate;
}

export function createDefaultColumnSchema(): SpecificColumnDef[] {
  return SPECIFIC_CANONICAL_TITLES.map((title, slotIndex) => ({
    id: newColumnId(),
    key: title,
    title,
    kind: "canonical" as SpecificColumnKind,
    slotIndex,
    editable: slotIndex !== 6,
  }));
}

function inferCustomColumns(
  records: SpecificRecordEntity[],
  canonicalKeys: Set<string>,
): SpecificColumnDef[] {
  const ordered = buildSpecificColumnKeys(records);
  const extras = ordered.filter((key) => !canonicalKeys.has(key) && !key.startsWith("_"));
  return extras.map((key) => ({
    id: newColumnId(),
    key,
    title: key,
    kind: "custom" as SpecificColumnKind,
    editable: true,
  }));
}

export function inferColumnSchemaFromRecords(
  records: SpecificRecordEntity[],
): SpecificColumnDef[] {
  const mapping = buildSpecificHeaderMapping(records);
  const canonical = SPECIFIC_CANONICAL_TITLES.map((title, slotIndex) => {
    const mappedKey = mapping.slotKeys[slotIndex]?.trim() || title;
    return {
      id: newColumnId(),
      key: mappedKey,
      title: mappedKey || title,
      kind: "canonical" as SpecificColumnKind,
      slotIndex,
      editable: slotIndex !== 6,
    };
  });

  const canonicalKeys = new Set(canonical.map((column) => column.key));
  if (!canonicalKeys.has(SPECIFIC_SOLD_DATE_KEY)) {
    const soldColumn = canonical[6];
    if (soldColumn && !soldColumn.key) {
      soldColumn.key = SPECIFIC_SOLD_DATE_KEY;
      soldColumn.title = SPECIFIC_SOLD_DATE_KEY;
      canonicalKeys.add(SPECIFIC_SOLD_DATE_KEY);
    }
  }

  return [...canonical, ...inferCustomColumns(records, canonicalKeys)];
}

export function resolveCategoryColumnSchema(
  category: Pick<SpecificCategoryEntity, "columnSchema">,
  records: SpecificRecordEntity[],
): SpecificColumnDef[] {
  if (category.columnSchema?.length) {
    return normalizeColumnSchema(category.columnSchema);
  }
  return inferColumnSchemaFromRecords(records);
}

export function categoryNeedsSchemaMigration(category: Pick<SpecificCategoryEntity, "columnSchema">): boolean {
  return !category.columnSchema || category.columnSchema.length === 0;
}

export function normalizeColumnSchema(schema: SpecificColumnDef[]): SpecificColumnDef[] {
  const canonicalBySlot = new Map<number, SpecificColumnDef>();
  const custom: SpecificColumnDef[] = [];

  for (const column of schema) {
    if (column.kind === "canonical" && column.slotIndex != null) {
      canonicalBySlot.set(column.slotIndex, column);
      continue;
    }
    if (column.kind === "custom") {
      custom.push(column);
    }
  }

  const canonical: SpecificColumnDef[] = [];
  for (let slotIndex = 0; slotIndex < SPECIFIC_SLOT_COUNT; slotIndex += 1) {
    const existing = canonicalBySlot.get(slotIndex);
    const title = SPECIFIC_CANONICAL_TITLES[slotIndex];
    canonical.push(
      existing ?? {
        id: newColumnId(),
        key: title,
        title,
        kind: "canonical",
        slotIndex,
        editable: slotIndex !== 6,
      },
    );
  }

  return [...canonical, ...custom];
}

export function schemaToHeaderMapping(schema: SpecificColumnDef[]): { slotKeys: string[] } {
  const slotKeys = Array.from({ length: SPECIFIC_SLOT_COUNT }, (_, index) => {
    const column = schema.find((item) => item.kind === "canonical" && item.slotIndex === index);
    return column?.key?.trim() ?? SPECIFIC_CANONICAL_TITLES[index];
  });
  return { slotKeys };
}

export function orderedSchemaKeys(schema: SpecificColumnDef[]): string[] {
  return schema.map((column) => column.key).filter((key) => key.trim().length > 0);
}

export function customColumnsFromSchema(schema: SpecificColumnDef[]): SpecificColumnDef[] {
  return schema.filter((column) => column.kind === "custom");
}

export function columnTitle(schema: SpecificColumnDef[], key: string): string {
  const match = schema.find((column) => column.key === key);
  return match?.title?.trim() || key;
}

export function applyColumnRenameToData(
  data: Record<string, string>,
  oldKey: string,
  newKey: string,
): Record<string, string> {
  if (oldKey === newKey || !(oldKey in data)) return data;
  const next = { ...data };
  next[newKey] = next[oldKey] ?? "";
  delete next[oldKey];
  return next;
}

export function applyColumnRemovalFromData(
  data: Record<string, string>,
  key: string,
): Record<string, string> {
  if (!(key in data)) return data;
  const next = { ...data };
  delete next[key];
  return next;
}

export function buildRowPayloadFromSchema(
  data: Record<string, string>,
  schema: SpecificColumnDef[],
): Record<string, string> {
  const payload: Record<string, string> = { ...data };
  for (const column of schema) {
    payload[column.key] = data[column.key] ?? "";
  }
  payload._columnOrder = JSON.stringify(orderedSchemaKeys(schema));
  return payload;
}

export type ColumnSchemaDiff = {
  renamed: Array<{ oldKey: string; newKey: string }>;
  removed: string[];
  added: string[];
};

export function diffColumnSchemas(
  previous: SpecificColumnDef[],
  next: SpecificColumnDef[],
): ColumnSchemaDiff {
  const previousById = new Map(previous.map((column) => [column.id, column]));
  const renamed: Array<{ oldKey: string; newKey: string }> = [];
  const removed: string[] = [];
  const added: string[] = [];

  for (const column of next) {
    const old = previousById.get(column.id);
    if (!old) {
      added.push(column.key);
      continue;
    }
    if (old.key !== column.key) {
      renamed.push({ oldKey: old.key, newKey: column.key });
    }
  }

  const nextIds = new Set(next.map((column) => column.id));
  for (const column of previous) {
    if (!nextIds.has(column.id)) {
      removed.push(column.key);
    }
  }

  return { renamed, removed, added };
}

export function categoriesShareName(
  left: string,
  right: string,
  sensitivity: "accent" | "base" = "accent",
): boolean {
  return left.trim().localeCompare(right.trim(), "ru", { sensitivity }) === 0;
}
