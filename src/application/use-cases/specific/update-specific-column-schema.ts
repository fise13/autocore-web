import { SpecificColumnDef } from "@/domain/specific-category";
import {
  SpecificCategoryEntity,
  SpecificCategoryRepository,
} from "@/infrastructure/firestore/specific-category-repository";
import { createActivityLogRepository } from "@/infrastructure/firestore/activity-log-repository";
import {
  diffColumnSchemas,
  normalizeColumnSchema,
} from "@/lib/specific/specific-category-schema";

export async function updateSpecificColumnSchemaUseCase(
  repository: SpecificCategoryRepository,
  params: {
    companyId: string;
    category: SpecificCategoryEntity;
    nextSchema: SpecificColumnDef[];
    actorUid: string;
  },
): Promise<SpecificCategoryEntity> {
  const normalized = normalizeColumnSchema(params.nextSchema);
  const diff = diffColumnSchemas(params.category.columnSchema, normalized);

  if (diff.renamed.length > 0 || diff.removed.length > 0) {
    await repository.batchUpdateRecordDataKeys(params.companyId, params.category, {
      rename: diff.renamed,
      remove: diff.removed,
    });
  }

  const updated = await repository.updateCategory(params.companyId, params.category, {
    columnSchema: normalized,
  });

  const activity = createActivityLogRepository();
  await activity.append(params.companyId, {
    actor: params.actorUid,
    action: "inventory.specific_columns_updated",
    target: `specificCategory:${updated.id}`,
    metadata: {
      added: diff.added.length,
      renamed: diff.renamed.length,
      removed: diff.removed.length,
    },
  });

  return updated;
}
