import {
  SpecificCategoryEntity,
  SpecificCategoryRepository,
} from "@/infrastructure/firestore/specific-category-repository";
import type { InventoryGroupId, InventorySubcategoryId } from "@/domain/inventory-taxonomy";

export async function createSpecificCategoryUseCase(
  repository: SpecificCategoryRepository,
  params: {
    companyId: string;
    name: string;
    existingCategories: SpecificCategoryEntity[];
    actorUid: string;
    groupId?: InventoryGroupId;
    subcategoryId?: InventorySubcategoryId;
  },
): Promise<SpecificCategoryEntity> {
  return repository.createCategory(
    params.companyId,
    params.name,
    params.existingCategories,
    params.actorUid,
    undefined,
    params.groupId,
    params.subcategoryId,
  );
}
