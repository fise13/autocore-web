import {
  SpecificCategoryEntity,
  SpecificCategoryRepository,
} from "@/infrastructure/firestore/specific-category-repository";

export async function renameSpecificCategoryUseCase(
  repository: SpecificCategoryRepository,
  params: {
    companyId: string;
    category: SpecificCategoryEntity;
    newName: string;
    existingCategories: SpecificCategoryEntity[];
  },
): Promise<SpecificCategoryEntity> {
  const trimmed = params.newName.trim();
  if (!trimmed) throw new Error("Название листа не может быть пустым");
  if (trimmed === params.category.name.trim()) return params.category;

  const duplicate = params.existingCategories.find(
    (item) =>
      item.id !== params.category.id &&
      item.name.localeCompare(trimmed, "ru", { sensitivity: "accent" }) === 0,
  );
  if (duplicate) {
    throw new Error(`Лист «${trimmed}» уже существует`);
  }

  return repository.updateCategory(params.companyId, params.category, { name: trimmed });
}
