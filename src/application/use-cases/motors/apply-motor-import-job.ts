import { commitMotorExcelImport } from "@/application/use-cases/commit-motor-excel-import";
import { createActivityLogRepository } from "@/infrastructure/firestore/activity-log-repository";
import { BrandEntity, CatalogRepository, EngineEntity } from "@/infrastructure/firestore/catalog-repository";
import { MotorImportRepository } from "@/infrastructure/firestore/motor-import-repository";
import { MotorRepository } from "@/infrastructure/firestore/motor-repository";
import {
  SpecificCategoryEntity,
  SpecificCategoryRepository,
} from "@/infrastructure/firestore/specific-category-repository";
import { MotorEntity } from "@/domain/motor";
import { MotorImportApplyProgress, MotorImportPreviewRow } from "@/lib/motors/import/types";
import { ExcelSheetData } from "@/lib/motors/excel-types";
import { SheetImportConfig } from "@/lib/motors/excel-sheet-config";
import { SheetColumnMapping } from "@/lib/motors/excel-column-mapping";

const APPLY_CHUNK_YIELD_EVERY = 25;

export async function applyMotorImportJobUseCase(
  importRepository: MotorImportRepository,
  params: {
    companyId: string;
    jobId: string;
    uid: string;
    sheets: ExcelSheetData[];
    sheetConfigs: SheetImportConfig[];
    columnMappings: Record<string, SheetColumnMapping>;
    engineRows: MotorImportPreviewRow[];
    repository: MotorRepository;
    catalogRepository: CatalogRepository;
    specificCategoryRepository: SpecificCategoryRepository;
    existingMotors: MotorEntity[];
    existingBrands: BrandEntity[];
    existingEngines: EngineEntity[];
    existingSpecificCategories: SpecificCategoryEntity[];
    actorUserId: string;
    sourceFileName?: string;
    onProgress?: (progress: MotorImportApplyProgress) => void;
    shouldCancel?: () => boolean;
  },
) {
  await importRepository.updateStatus(params.jobId, "applying");

  const selectedRows = params.engineRows.filter((row) => row.selected && row.errors.length === 0);
  let applied = 0;

  try {
    const result = await commitMotorExcelImport({
      uid: params.uid,
      companyId: params.companyId,
      repository: params.repository,
      catalogRepository: params.catalogRepository,
      specificCategoryRepository: params.specificCategoryRepository,
      existingMotors: params.existingMotors,
      existingBrands: params.existingBrands,
      existingEngines: params.existingEngines,
      existingSpecificCategories: params.existingSpecificCategories,
      sheets: params.sheets,
      sheetConfigs: params.sheetConfigs,
      columnMappings: params.columnMappings,
      selectedEngineRows: selectedRows,
      shouldCancel: params.shouldCancel,
      onProgress: (progress) => {
        applied = progress.applied;
        params.onProgress?.({
          applied: progress.applied,
          failed: 0,
          total: selectedRows.length,
          percent: progress.percent,
          cancelled: Boolean(params.shouldCancel?.()),
        });
      },
    });

    if (params.shouldCancel?.()) {
      await importRepository.updateStatus(params.jobId, "failed", "Импорт отменён пользователем");
      return { ...result, cancelled: true };
    }

    await importRepository.markCompleted(
      params.jobId,
      params.companyId,
      params.actorUserId,
      {
        imported: result.imported,
        updated: result.updated,
        skipped: result.skipped,
        specificRecordsImported: result.specificRecordsImported,
      },
      {
        createdMotorIds: result.createdMotorIds,
        updatedMotorIds: result.updatedMotorIds,
      },
    );

    const activity = createActivityLogRepository();
    await activity.append(params.companyId, {
      actor: params.actorUserId,
      action: "inventory.motor_imported",
      target: params.sourceFileName?.trim() || `motorImport:${params.jobId}`,
      targetId: params.jobId,
      metadata: {
        imported: result.imported,
        updated: result.updated,
        skipped: result.skipped,
        specificRecordsImported: result.specificRecordsImported ?? 0,
      },
    });

    if (applied % APPLY_CHUNK_YIELD_EVERY === 0) {
      await new Promise((resolve) => setTimeout(resolve, 0));
    }

    return { ...result, cancelled: false };
  } catch (error) {
    const message = error instanceof Error ? error.message : "Не удалось применить импорт";
    await importRepository.updateStatus(params.jobId, "failed", message);
    const activity = createActivityLogRepository();
    await activity.append(params.companyId, {
      actor: params.actorUserId,
      action: "inventory.motor_import_failed",
      target: `motorImport:${params.jobId}`,
      targetId: params.jobId,
      metadata: { message },
    });
    throw error;
  }
}
