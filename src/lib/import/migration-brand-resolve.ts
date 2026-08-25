/**
 * Resolve brand/model hints for migration rows (dictionary + heuristics).
 */

import { searchDomain } from "@/lib/domain/domain-dictionary";
import { resolveBrandDisplayName } from "@/lib/motors/import-normalization";
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

/**
 * One spelling per manufacturer. Empty when the input cannot be read as a
 * brand at all, so the caller can fall back rather than store a blank.
 */
function canonicalBrand(raw: string): string {
  return resolveBrandDisplayName(raw).trim();
}

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

/**
 * Brand from explicit column, domain dictionary, or serial heuristics —
 * always canonicalized.
 *
 * The explicit column used to be returned verbatim, and that is how the brand
 * list ended up holding `Subaru` next to `SUBARU`, `Nissan` next to `NISSAN`,
 * `Renault` next to `RENAULT` and `Suzuki` next to `SUZUKI`: one spelling came
 * from a sheet that shouted, the other from the dictionary. To the app they
 * were four different manufacturers, so the sidebar listed each twice and
 * filtering by one hid half the stock.
 *
 * `resolveBrandDisplayName` already knows every spelling, and knows that a
 * «МАРКА» column often holds a *model* — `CRUZE` is a Chevrolet, not a make.
 * This path simply never called it.
 */
export function resolveMigrationBrandName(
  values: RowValues,
  recordType: RecordType,
): string | undefined {
  const explicit = values.brand?.trim();
  if (explicit) return canonicalBrand(explicit) || explicit;

  const queries = [values.name, values.model, values.serial, values.sku].filter(Boolean) as string[];
  const categories = dictionaryCategoriesForRecordType(recordType);

  for (const query of queries) {
    for (const category of categories) {
      const hit = searchDomain(category, query, null, { limit: 1 })[0];
      if (hit?.entry.brand) return canonicalBrand(hit.entry.brand) || hit.entry.brand;
    }
  }

  if (recordType === "transmission" || recordType === "transferCase" || recordType === "reducer") {
    for (const query of queries) {
      const fromSerial = inferBrandFromTransmissionSerial(query);
      if (fromSerial) return canonicalBrand(fromSerial) || fromSerial;
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
