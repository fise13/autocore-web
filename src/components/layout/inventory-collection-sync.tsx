"use client";

import { useInventoryCollectionSync } from "@/hooks/use-inventory-collection-sync";
import type { SpecificCategoryEntity } from "@/infrastructure/firestore/specific-category-repository";

type InventoryCollectionSyncProps = {
  specificCategories: SpecificCategoryEntity[];
  enabled?: boolean;
};

export function InventoryCollectionSync({
  specificCategories,
  enabled = true,
}: InventoryCollectionSyncProps) {
  useInventoryCollectionSync({ specificCategories, enabled });
  return null;
}
