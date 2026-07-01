import { InventoryItemRepository } from "@/infrastructure/firestore/inventory-item-repository";
import { taxonomyPatchForItem } from "@/lib/warehouse/inventory-taxonomy-normalize";

const BACKFILL_STORAGE_KEY = "warehouse-inventory-taxonomy-backfill-v1";

export function hasCompletedInventoryTaxonomyBackfill(companyId: string): boolean {
  if (typeof window === "undefined") return true;
  return window.localStorage.getItem(`${BACKFILL_STORAGE_KEY}:${companyId}`) === "1";
}

export function markInventoryTaxonomyBackfillComplete(companyId: string): void {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(`${BACKFILL_STORAGE_KEY}:${companyId}`, "1");
}

export async function backfillInventoryTaxonomyUseCase(
  repository: InventoryItemRepository,
  companyId: string,
): Promise<{ updated: number; skipped: number }> {
  const items = await repository.fetchAllActive(companyId);
  const patches = items
    .map((item) => {
      const patch = taxonomyPatchForItem(item);
      return patch ? { itemId: item.id, ...patch } : null;
    })
    .filter((patch): patch is NonNullable<typeof patch> => patch != null);

  if (patches.length === 0) {
    markInventoryTaxonomyBackfillComplete(companyId);
    return { updated: 0, skipped: items.length };
  }

  await repository.batchUpdateTaxonomy(companyId, patches);
  markInventoryTaxonomyBackfillComplete(companyId);
  return { updated: patches.length, skipped: items.length - patches.length };
}
