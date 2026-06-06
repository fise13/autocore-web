import { WarehouseRepository } from "@/infrastructure/firestore/warehouse-repository";
import { defaultWarehouseDocId } from "@/lib/warehouse/default-warehouse-id";

export async function ensureDefaultWarehouseUseCase(
  repository: WarehouseRepository,
  companyId: string,
  actorUserId?: string,
) {
  const docId = defaultWarehouseDocId(companyId);
  const existing = await repository.getDefault(companyId);
  if (existing) {
    await repository.consolidateDuplicateMains(companyId, docId);
    return existing;
  }

  const warehouseId = await repository.ensureDefault({
    companyId,
    name: "Основной склад",
    code: "MAIN",
    actorUserId,
    docId,
  });

  await repository.consolidateDuplicateMains(companyId, docId);

  const warehouses = await repository.list(companyId);
  return warehouses.find((warehouse) => warehouse.id === warehouseId) ?? null;
}
