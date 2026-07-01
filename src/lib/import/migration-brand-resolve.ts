/**
 * Resolve brand/model hints for migration rows (dictionary + heuristics).
 */

import { searchDomain } from "@/lib/domain/domain-dictionary";
import type { DomainCategory } from "@/lib/domain/types";

import type { CanonicalField, RecordType } from "./types";

type RowValues = Partial<Record<CanonicalField, string>>;

/** OEM gearbox serial prefixes common in dismantling catalogs. */
const TRANSMISSION_SERIAL_BRANDS: Array<[RegExp, string]> = [
  [/^TR|^TV|^TZ|^TG|^TY/i, "Subaru"],
  [/^U66|^U76|^A34|^A75|^A76|^A96|^K11/i, "Toyota"],
  [/^JF|^RE|^QR|^RL|^CVT/i, "Nissan"],
  [/^09G|^0C8|^DQ|^02E/i, "Volkswagen"],
  [/^A6M|^A5M|^A4C/i, "Hyundai"],
  [/^F4A|^W4A|^V4A/i, "Mitsubishi"],
];

function dictionaryCategoriesForRecordType(recordType: RecordType): DomainCategory[] {
  switch (recordType) {
    case "engine":
      return ["engines", "brands"];
    case "transmission":
    case "transferCase":
    case "reducer":
    case "turbo":
      return ["transmissions", "brands"];
    case "body":
    case "optics":
    case "suspension":
    case "electrical":
      return ["bodyParts", "brands", "models"];
    case "consumable":
      return ["consumables", "brands"];
    default:
      return ["brands", "models", "engines", "transmissions", "bodyParts"];
  }
}

function inferBrandFromTransmissionSerial(value: string): string | undefined {
  const compact = value.replace(/\s+/g, "");
  for (const [pattern, brand] of TRANSMISSION_SERIAL_BRANDS) {
    if (pattern.test(compact)) return brand;
  }
  return undefined;
}

/** Brand from explicit column, domain dictionary, or serial heuristics. */
export function resolveMigrationBrandName(
  values: RowValues,
  recordType: RecordType,
): string | undefined {
  const explicit = values.brand?.trim();
  if (explicit) return explicit;

  const queries = [values.name, values.model, values.serial, values.sku].filter(Boolean) as string[];
  const categories = dictionaryCategoriesForRecordType(recordType);

  for (const query of queries) {
    for (const category of categories) {
      const hit = searchDomain(category, query, null, { limit: 1 })[0];
      if (hit?.entry.brand) return hit.entry.brand;
    }
  }

  if (recordType === "transmission" || recordType === "transferCase" || recordType === "reducer") {
    for (const query of queries) {
      const fromSerial = inferBrandFromTransmissionSerial(query);
      if (fromSerial) return fromSerial;
    }
  }

  return undefined;
}

export function enrichMigrationValuesWithBrand(
  values: RowValues,
  recordType: RecordType,
): RowValues {
  const brand = resolveMigrationBrandName(values, recordType);
  if (!brand || values.brand?.trim()) return values;
  return { ...values, brand };
}
