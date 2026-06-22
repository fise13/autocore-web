import {
  SpecificCategoryEntity,
  SpecificCategoryRepository,
  SpecificRecordEntity,
} from "@/infrastructure/firestore/specific-category-repository";
import {
  categoryNeedsSchemaMigration,
  inferColumnSchemaFromRecords,
} from "@/lib/specific/specific-category-schema";

export async function ensureSpecificCategorySchemaUseCase(
  repository: SpecificCategoryRepository,
  params: {
    companyId: string;
    category: SpecificCategoryEntity;
    records: SpecificRecordEntity[];
    actorUid?: string;
  },
): Promise<SpecificCategoryEntity> {
  if (!categoryNeedsSchemaMigration(params.category)) {
    return params.category;
  }

  const columnSchema = inferColumnSchemaFromRecords(params.records);
  const updated = await repository.updateCategory(params.companyId, params.category, {
    columnSchema,
  });

  return updated;
}
