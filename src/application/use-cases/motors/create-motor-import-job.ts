import { MotorEntity } from "@/domain/motor";
import { BrandEntity, EngineEntity } from "@/infrastructure/firestore/catalog-repository";
import { createActivityLogRepository } from "@/infrastructure/firestore/activity-log-repository";
import { MotorImportRepository } from "@/infrastructure/firestore/motor-import-repository";
import { runMotorImportPreviewPipeline } from "@/lib/motors/import/pipeline";
import { MotorImportProgress } from "@/lib/motors/import/types";
import { ExcelSheetData } from "@/lib/motors/excel-types";

export async function createMotorImportJobUseCase(
  importRepository: MotorImportRepository,
  params: {
    companyId: string;
    sourceFileName?: string;
    sheets: ExcelSheetData[];
    existingMotors: MotorEntity[];
    existingBrands: BrandEntity[];
    existingEngines: EngineEntity[];
    existingSpecificCategories?: Array<{ name: string }>;
    createdByUserId: string;
    useAi?: boolean;
    onProgress?: (progress: MotorImportProgress) => void;
  },
) {
  const preview = await runMotorImportPreviewPipeline({
    companyId: params.companyId,
    sheets: params.sheets,
    existingMotors: params.existingMotors,
    existingBrands: params.existingBrands,
    existingEngines: params.existingEngines,
    existingSpecificCategories: params.existingSpecificCategories,
    useAi: params.useAi,
    magicImport: params.useAi,
    onProgress: params.onProgress,
  });

  const sheetConfigs = Object.values(preview.sheetMappings).map((item) => item.config);
  const columnMappings = Object.fromEntries(
    Object.entries(preview.sheetMappings).map(([id, item]) => [id, item.columnMapping]),
  );

  const jobId = await importRepository.createJob({
    companyId: params.companyId,
    sourceFileName: params.sourceFileName,
    sheetConfigs,
    columnMappings,
    engineRows: preview.engineRows,
    stats: preview.stats,
    createdByUserId: params.createdByUserId,
  });

  await importRepository.appendAuditEvent(jobId, {
    actor: params.createdByUserId,
    action: "import_started",
    metadata: { fileName: params.sourceFileName ?? "", totalRows: preview.stats.totalEngineRows },
  });

  const usedAi = Object.values(preview.sheetMappings).some((item) => item.source === "ai");
  if (usedAi) {
    await importRepository.appendAuditEvent(jobId, {
      actor: params.createdByUserId,
      action: "import_ai_mapped",
      metadata: { notes: preview.aiNotes ?? "" },
    });
    const activity = createActivityLogRepository();
    await activity.append(params.companyId, {
      actor: params.createdByUserId,
      action: "inventory.motor_import_ai_mapped",
      target: `motorImport:${jobId}`,
      targetId: jobId,
      metadata: { notes: preview.aiNotes ?? null },
    });
  }

  return { jobId, ...preview };
}
