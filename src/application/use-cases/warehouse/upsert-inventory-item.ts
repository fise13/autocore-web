import { UpsertInventoryItemInput } from "@/domain/inventory";
import { upsertInventoryItemSchema } from "@/domain/schemas";
import { InventoryItemRepository } from "@/infrastructure/firestore/inventory-item-repository";

export async function upsertInventoryItemUseCase(
  repository: InventoryItemRepository,
  input: UpsertInventoryItemInput,
  itemId?: string,
): Promise<string> {
  const parsed = upsertInventoryItemSchema.parse(input);
  if (!itemId) {
    const existing = await repository.findBySku(parsed.companyId, parsed.sku);
    if (existing) {
      throw new Error(`Артикул «${parsed.sku}» уже существует`);
    }
  }
  return repository.upsert(parsed, itemId);
}
