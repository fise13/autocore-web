import { WarehouseRepository } from "@/infrastructure/firestore/warehouse-repository";

export async function ensureDefaultWarehouseUseCase(
  repository: WarehouseRepository,
  companyId: string,
  actorUserId?: string,
) {
  const existing = await repository.getDefault(companyId);
  if (existing) return existing;

  const warehouseId = await repository.create({
    companyId,
    name: "Основной склад",
    code: "MAIN",
    isDefault: true,
    actorUserId,
  });

  const warehouses = await repository.list(companyId);
  return warehouses.find((warehouse) => warehouse.id === warehouseId) ?? null;
}
