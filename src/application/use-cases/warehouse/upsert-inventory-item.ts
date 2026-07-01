import { UpsertInventoryItemInput } from "@/domain/inventory";
import { upsertInventoryItemSchema } from "@/domain/schemas";
import { InventoryItemRepository } from "@/infrastructure/firestore/inventory-item-repository";
import { normalizeInventoryTaxonomyInput } from "@/lib/warehouse/inventory-taxonomy-normalize";

export async function upsertInventoryItemUseCase(
  repository: InventoryItemRepository,
  input: UpsertInventoryItemInput,
  itemId?: string,
): Promise<string> {
  const normalized = normalizeInventoryTaxonomyInput(input);
  const parsed = upsertInventoryItemSchema.parse(normalized);
  if (!itemId) {
    const existing = await repository.findBySku(parsed.companyId, parsed.sku);
    if (existing) {
      throw new Error(`Артикул «${parsed.sku}» уже существует`);
    }
  }
  return repository.upsert(
    {
      ...parsed,
      inventoryGroup: normalized.inventoryGroup,
      subcategoryId: normalized.subcategoryId,
    },
    itemId,
  );
}
