import { WarehouseRepository } from "@/infrastructure/firestore/warehouse-repository";

export async function createWarehouseUseCase(
  repository: WarehouseRepository,
  params: {
    companyId: string;
    name: string;
    actorUserId: string;
    isDefault?: boolean;
  },
) {
  return repository.create({
    companyId: params.companyId,
    name: params.name,
    actorUserId: params.actorUserId,
    isDefault: params.isDefault,
  });
}
