import { SpecificRecordEntity } from "@/infrastructure/firestore/specific-category-repository";

import {
  specificValueForSlot,
  SpecificHeaderMapping,
} from "@/lib/specific/specific-header-mapping";

export function specificRecordLabel(
  record: Pick<SpecificRecordEntity, "data" | "rowIndex">,
  mapping: SpecificHeaderMapping,
): string {
  const primary = specificValueForSlot(record.data, mapping, 0).trim();
  if (primary) return primary;

  const secondary = specificValueForSlot(record.data, mapping, 1).trim();
  if (secondary) return secondary;

  return `Строка ${record.rowIndex}`;
}
