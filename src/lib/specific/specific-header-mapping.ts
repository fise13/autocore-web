import { SpecificRecordEntity } from "@/infrastructure/firestore/specific-category-repository";

import { buildSpecificColumnKeys } from "@/lib/specific/specific-table";

export const SPECIFIC_SLOT_COUNT = 7;

export const SPECIFIC_CANONICAL_TITLES = [
  "Номер двигателя",
  "Комплектация",
  "Особые отметки",
  "Кол-во",
  "Коробка",
  "Дата прихода",
  "Дата продажи",
] as const;

export const SPECIFIC_SOLD_DATE_KEY = SPECIFIC_CANONICAL_TITLES[6];

const SEMANTIC_ALIASES: string[][] = [
  ["номердвигателя", "номер", "serial", "serialcode", "enginenumber", "двигатель"],
  ["комплектация", "configuration", "config"],
  ["особыеотметки", "примечание", "заметка", "notes", "note", "comment", "описание"],
  ["колво", "количество", "qty", "quantity", "count"],
  ["коробка", "transmission", "кпп", "at", "mt"],
  ["датаприхода", "arrivaldate", "приход", "датыприхода", "datein"],
  ["датапродажи", "solddate", "продажа", "датыпродажи", "dateout"],
];

function normalizeKey(key: string): string {
  return key
    .normalize("NFD")
    .replace(/\p{M}/gu, "")
    .toLowerCase()
    .replace(/[_\s-]+/g, "");
}

function availableKeys(records: SpecificRecordEntity[]): string[] {
  const keys = new Set<string>();
  for (const record of records) {
    for (const key of Object.keys(record.data)) {
      if (key.startsWith("_")) continue;
      if (!key.trim()) continue;
      keys.add(key);
    }
  }
  return [...keys].sort((left, right) => left.localeCompare(right, "ru"));
}

function makeMapping(orderedKeys: string[]): SpecificHeaderMapping {
  const remaining = orderedKeys
    .map((key) => key.trim())
    .filter((key) => key.length > 0 && !key.startsWith("_"));
  const slots = Array.from({ length: SPECIFIC_SLOT_COUNT }, () => "");

  for (let slotIndex = 0; slotIndex < SPECIFIC_SLOT_COUNT; slotIndex += 1) {
    const aliases = SEMANTIC_ALIASES[slotIndex] ?? [];
    const matchIndex = remaining.findIndex((key) => {
      const normalized = normalizeKey(key);
      return aliases.some(
        (alias) => normalized.includes(alias) || alias.includes(normalized),
      );
    });
    if (matchIndex >= 0) {
      slots[slotIndex] = remaining.splice(matchIndex, 1)[0] ?? "";
    }
  }

  for (let slotIndex = 0; slotIndex < SPECIFIC_SLOT_COUNT; slotIndex += 1) {
    if (slots[slotIndex] || remaining.length === 0) continue;
    slots[slotIndex] = remaining.shift() ?? "";
  }

  if (!slots[6]) {
    slots[6] = SPECIFIC_SOLD_DATE_KEY;
  }

  return { slotKeys: slots };
}

export type SpecificHeaderMapping = {
  slotKeys: string[];
};

export function buildSpecificHeaderMapping(records: SpecificRecordEntity[]): SpecificHeaderMapping {
  const savedOrder = buildSpecificColumnKeys(records);
  if (savedOrder.length > 0) {
    const allKeys = availableKeys(records);
    const merged = [...savedOrder, ...allKeys.filter((key) => !savedOrder.includes(key))];
    return makeMapping(merged);
  }

  const frequency = new Map<string, number>();
  for (const record of records) {
    for (const key of Object.keys(record.data)) {
      if (key.startsWith("_")) continue;
      frequency.set(key, (frequency.get(key) ?? 0) + 1);
    }
  }

  const orderedKeys = [...frequency.keys()].sort((left, right) => {
    const leftCount = frequency.get(left) ?? 0;
    const rightCount = frequency.get(right) ?? 0;
    if (leftCount !== rightCount) return rightCount - leftCount;
    return left.localeCompare(right, "ru");
  });

  return makeMapping(orderedKeys);
}

export function specificSlotTitle(mapping: SpecificHeaderMapping, slotIndex: number): string {
  const key = mapping.slotKeys[slotIndex]?.trim();
  if (key) return key;
  return SPECIFIC_CANONICAL_TITLES[slotIndex] ?? `Поле ${slotIndex + 1}`;
}

export function specificValueForSlot(
  data: Record<string, string>,
  mapping: SpecificHeaderMapping,
  slotIndex: number,
): string {
  const key = mapping.slotKeys[slotIndex];
  if (!key) return "";
  return data[key] ?? "";
}

export function resolveSpecificSoldDateKey(mapping: SpecificHeaderMapping): string {
  return mapping.slotKeys[6]?.trim() || SPECIFIC_SOLD_DATE_KEY;
}

export function isSpecificRecordSold(
  record: Pick<SpecificRecordEntity, "data">,
  mapping: SpecificHeaderMapping,
): boolean {
  const soldKey = resolveSpecificSoldDateKey(mapping);
  if ((record.data[soldKey] ?? "").trim().length > 0) return true;

  for (const [key, value] of Object.entries(record.data)) {
    if (key.startsWith("_") || !value.trim()) continue;
    const normalized = normalizeKey(key);
    const aliases = SEMANTIC_ALIASES[6] ?? [];
    if (
      aliases.some((alias) => normalized.includes(alias) || alias.includes(normalized))
    ) {
      return true;
    }
  }

  return false;
}

export function applySpecificSlotValue(
  data: Record<string, string>,
  mapping: SpecificHeaderMapping,
  slotIndex: number,
  value: string,
): Record<string, string> {
  const key = mapping.slotKeys[slotIndex];
  if (!key) return data;
  return {
    ...data,
    [key]: value,
  };
}

export function buildSpecificRowPayload(
  data: Record<string, string>,
  mapping: SpecificHeaderMapping,
): Record<string, string> {
  const payload: Record<string, string> = { ...data };
  for (const key of mapping.slotKeys) {
    if (!key) continue;
    payload[key] = data[key] ?? "";
  }
  const orderedKeys = mapping.slotKeys.filter((key) => key.trim().length > 0);
  payload._columnOrder = JSON.stringify(orderedKeys);
  return payload;
}
