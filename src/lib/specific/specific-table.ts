import { SpecificRecordEntity } from "@/infrastructure/firestore/specific-category-repository";
import { MotorAvailability } from "@/infrastructure/firestore/motor-repository";

import {
  buildSpecificHeaderMapping,
  isSpecificRecordSold,
  SpecificHeaderMapping,
} from "@/lib/specific/specific-header-mapping";

function parseColumnOrder(records: SpecificRecordEntity[]): string[] {
  for (const record of records) {
    const raw = record.data._columnOrder;
    if (!raw) continue;
    try {
      const parsed = JSON.parse(raw) as unknown;
      if (Array.isArray(parsed)) {
        return parsed.map((item) => String(item)).filter((item) => item.trim().length > 0);
      }
    } catch {
      // ignore malformed order metadata
    }
  }
  return [];
}

export function buildSpecificColumnKeys(records: SpecificRecordEntity[]): string[] {
  const savedOrder = parseColumnOrder(records);
  const frequency = new Map<string, number>();

  for (const record of records) {
    for (const key of Object.keys(record.data)) {
      if (key.startsWith("_")) continue;
      frequency.set(key, (frequency.get(key) ?? 0) + 1);
    }
  }

  const fallback = [...frequency.keys()].sort((left, right) => {
    const leftCount = frequency.get(left) ?? 0;
    const rightCount = frequency.get(right) ?? 0;
    if (leftCount !== rightCount) return rightCount - leftCount;
    return left.localeCompare(right, "ru");
  });

  if (savedOrder.length === 0) return fallback;

  const merged = [...savedOrder];
  for (const key of fallback) {
    if (!merged.includes(key)) merged.push(key);
  }
  return merged;
}

export function filterSpecificRecords(
  records: SpecificRecordEntity[],
  search: string,
): SpecificRecordEntity[] {
  const query = search.trim().toLowerCase();
  if (!query) return records;

  return records.filter((record) =>
    Object.entries(record.data).some(([key, value]) => {
      if (key.startsWith("_")) return false;
      return key.toLowerCase().includes(query) || value.toLowerCase().includes(query);
    }),
  );
}

export function specificRecordValue(record: SpecificRecordEntity, columnKey: string): string {
  return record.data[columnKey] ?? "";
}

export function filterSpecificRecordsByAvailability(
  records: SpecificRecordEntity[],
  availability: MotorAvailability,
  mapping: SpecificHeaderMapping = buildSpecificHeaderMapping(records),
): SpecificRecordEntity[] {
  if (availability === "all") return records;
  if (availability === "sold") {
    return records.filter((record) => isSpecificRecordSold(record, mapping));
  }
  return records.filter((record) => !isSpecificRecordSold(record, mapping));
}
