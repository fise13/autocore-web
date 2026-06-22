import { SpecificCategoryRepository } from "@/infrastructure/firestore/specific-category-repository";

export async function deleteSpecificRecordUseCase(
  repository: SpecificCategoryRepository,
  params: {
    recordId: string;
    companyId: string;
    actorUid: string;
  },
): Promise<void> {
  await repository.deleteRecord(params.recordId, params.actorUid, params.companyId);
}
