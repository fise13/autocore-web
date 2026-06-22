import {
  SpecificCategoryEntity,
  SpecificCategoryRepository,
} from "@/infrastructure/firestore/specific-category-repository";

export async function deleteSpecificCategoryUseCase(
  repository: SpecificCategoryRepository,
  params: {
    companyId: string;
    category: SpecificCategoryEntity;
    actorUid: string;
  },
): Promise<void> {
  await repository.deleteCategory(params.companyId, params.category, params.actorUid);
}
