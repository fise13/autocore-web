import {
  SpecificCategoryEntity,
  SpecificCategoryRepository,
} from "@/infrastructure/firestore/specific-category-repository";

export async function createSpecificCategoryUseCase(
  repository: SpecificCategoryRepository,
  params: {
    companyId: string;
    name: string;
    existingCategories: SpecificCategoryEntity[];
    actorUid: string;
  },
): Promise<SpecificCategoryEntity> {
  return repository.createCategory(
    params.companyId,
    params.name,
    params.existingCategories,
    params.actorUid,
  );
}
