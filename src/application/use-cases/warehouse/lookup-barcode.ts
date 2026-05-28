import { BarcodeMappingRepository } from "@/infrastructure/firestore/barcode-mapping-repository";
import { InventoryItemRepository } from "@/infrastructure/firestore/inventory-item-repository";

export async function lookupBarcodeUseCase(
  barcodeRepository: BarcodeMappingRepository,
  itemRepository: InventoryItemRepository,
  companyId: string,
  barcode: string,
) {
  const mapping = await barcodeRepository.findByBarcode(companyId, barcode);
  if (mapping) {
    const item = await itemRepository.getById(mapping.itemId);
    return { mapping, item };
  }

  const normalized = barcode.trim().toUpperCase();
  const bySku = await itemRepository.findBySku(companyId, normalized);
  if (bySku) {
    return { mapping: null, item: bySku };
  }

  return { mapping: null, item: null };
}
