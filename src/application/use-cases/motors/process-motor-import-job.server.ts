import "server-only";

import { commitMotorExcelImport } from "@/application/use-cases/commit-motor-excel-import";
import {
  rollbackMotorImportPartialApply,
} from "@/application/use-cases/motors/rollback-motor-import-partial.server";
import { MotorImportJob } from "@/domain/motor-import";
import {
  assertMotorImportCompanyAccess,
  claimMotorImportJobForApply,
  claimMotorImportJobForProcessing,
  completeMotorImportAnalyze,
  downloadMotorImportFile,
  getMotorImportJobAdmin,
  isMotorImportJobCancelledAdmin,
  loadMotorImportEngineRowsAdmin,
  markMotorImportJobCompleted,
  persistMotorImportEngineRows,
  persistMotorImportRollbackSnapshot,
  resetStuckMotorImportApply,
  updateMotorImportJobMappings,
  updateMotorImportJobProgress,
  updateMotorImportJobStatus,
} from "@/infrastructure/firestore/admin/motor-import-admin";
import {
  createAdminMotorImportRepositories,
  loadMotorImportServerContext,
} from "@/infrastructure/firestore/admin/motor-import-server-deps";
import { readExcelSheetsFromBuffer } from "@/lib/motors/excel-import.server";
import { runMotorImportPreviewPipeline } from "@/lib/motors/import/pipeline";
import { prepareMagicImportRowsForCommit, countMagicImportRowsReady } from "@/lib/motors/import/import-row-integrity";
import { MotorImportPreviewRow, MotorSheetMappingResult } from "@/lib/motors/import/types";
import { SheetColumnMapping } from "@/lib/motors/excel-column-mapping";
import { SheetImportConfig } from "@/lib/motors/excel-sheet-config";

function canAutoApplyMotorImport(job: MotorImportJob): boolean {
  return Boolean(
    job.autoApply &&
      job.quickImport &&
      job.stats.validEngineRows > 0 &&
      job.stats.errors === 0 &&
      job.stats.specificSheets === 0,
  );
}

function createThrottledProgressReporter(jobId: string) {
  let lastWriteAt = 0;
  let lastPercent = -1;

  return (progress: {
    phase: "apply";
    percent: number;
    message: string;
    current?: number;
    total?: number;
  }) => {
    const now = Date.now();
    const shouldWrite =
      progress.percent >= 100 ||
      progress.percent <= 10 ||
      progress.percent - lastPercent >= 2 ||
      now - lastWriteAt >= 500;
    if (!shouldWrite) return;
    lastWriteAt = now;
    lastPercent = progress.percent;
    void updateMotorImportJobProgress(jobId, progress);
  };
}

async function claimMotorImportJobForApplyWithRecovery(
  jobId: string,
  retryCount = 0,
): Promise<{ job: MotorImportJob; claimed: boolean } | null> {
  if (await isMotorImportJobCancelledAdmin(jobId)) {
    const job = await getMotorImportJobAdmin(jobId);
    return job ? { job, claimed: false } : null;
  }
  const claimResult = await claimMotorImportJobForApply(jobId);
  if (!claimResult) return null;
  if (claimResult.claimed) return claimResult;
  if (claimResult.job.status !== "applying" || retryCount >= 1) return claimResult;
  const reset = await resetStuckMotorImportApply(jobId);
  if (!reset) return claimResult;
  return claimMotorImportJobForApplyWithRecovery(jobId, retryCount + 1);
}

export async function analyzeMotorImportJobOnServer(params: {
  companyId: string;
  uid: string;
  jobId: string;
}): Promise<MotorImportJob | null> {
  if (await isMotorImportJobCancelledAdmin(params.jobId)) {
    return getMotorImportJobAdmin(params.jobId);
  }

  const claimed = await claimMotorImportJobForProcessing(params.jobId);
  if (!claimed) return null;

  assertMotorImportCompanyAccess(claimed, params.companyId);

  if (claimed.status === "cancelled") {
    return claimed;
  }

  if (claimed.status !== "analyzing" && claimed.status !== "queued") {
    return claimed;
  }

  if (!claimed.storagePath) {
    await updateMotorImportJobStatus(params.jobId, "failed", "Файл импорта не найден");
    return getMotorImportJobAdmin(params.jobId);
  }

  try {
    const buffer = await downloadMotorImportFile(claimed.storagePath);
    const sheets = readExcelSheetsFromBuffer(buffer);
    const context = await loadMotorImportServerContext(params.companyId, params.uid);

    if (await isMotorImportJobCancelledAdmin(params.jobId)) {
      return getMotorImportJobAdmin(params.jobId);
    }

    const preview = await runMotorImportPreviewPipeline({
      companyId: params.companyId,
      sheets,
      existingMotors: context.existingMotors,
      existingBrands: context.existingBrands,
      existingEngines: context.existingEngines,
      existingSpecificCategories: context.existingSpecificCategories,
      useAi: true,
      magicImport: true,
      onProgress: (progress) => {
        void updateMotorImportJobProgress(params.jobId, {
          phase: "analyze",
          percent: progress.percent,
          message: progress.message,
          current: progress.current,
          total: progress.total,
        });
      },
    });

    if (await isMotorImportJobCancelledAdmin(params.jobId)) {
      return getMotorImportJobAdmin(params.jobId);
    }

    const sheetConfigs = Object.values(preview.sheetMappings).map((item) => item.config);
    const columnMappings = Object.fromEntries(
      Object.entries(preview.sheetMappings).map(([id, item]) => [id, item.columnMapping]),
    );

    await completeMotorImportAnalyze({
      jobId: params.jobId,
      companyId: params.companyId,
      sourceFileName: claimed.sourceFileName,
      sheetConfigs,
      columnMappings,
      engineRows: preview.engineRows,
      stats: preview.stats,
      quickImport: preview.quickImport ?? false,
      aiNotes: preview.aiNotes,
      specificSheetsPreview: preview.specificSheets.map((item) => ({
        configId: item.configId,
        sheetName: item.sheetName,
        categoryName: item.categoryName,
        rowCount: item.rowCount,
      })),
    });

    const updated = await getMotorImportJobAdmin(params.jobId);
    if (!updated) return null;

    if (canAutoApplyMotorImport(updated)) {
      return applyMotorImportJobOnServer({
        companyId: params.companyId,
        uid: params.uid,
        jobId: params.jobId,
      });
    }

    return updated;
  } catch (error) {
    if (await isMotorImportJobCancelledAdmin(params.jobId)) {
      return getMotorImportJobAdmin(params.jobId);
    }
    const message = error instanceof Error ? error.message : "Ошибка анализа файла";
    await updateMotorImportJobStatus(params.jobId, "failed", message);
    return getMotorImportJobAdmin(params.jobId);
  }
}

export async function applyMotorImportJobOnServer(params: {
  companyId: string;
  uid: string;
  jobId: string;
  engineRows?: MotorImportPreviewRow[];
  sheetConfigs?: SheetImportConfig[];
  columnMappings?: Record<string, SheetColumnMapping>;
  skipClaim?: boolean;
}): Promise<MotorImportJob | null> {
  if (await isMotorImportJobCancelledAdmin(params.jobId)) {
    return getMotorImportJobAdmin(params.jobId);
  }

  let job: MotorImportJob;

  if (params.skipClaim) {
    const existing = await getMotorImportJobAdmin(params.jobId);
    if (!existing) return null;
    assertMotorImportCompanyAccess(existing, params.companyId);
    if (existing.status !== "applying") return existing;
    job = existing;
  } else {
    const claimResult = await claimMotorImportJobForApplyWithRecovery(params.jobId);
    if (!claimResult) return null;

    assertMotorImportCompanyAccess(claimResult.job, params.companyId);

    if (!claimResult.claimed) {
      return claimResult.job;
    }

    job = claimResult.job;
  }

  const reportApplyProgress = createThrottledProgressReporter(params.jobId);

  if (params.sheetConfigs?.length && params.columnMappings) {
    await updateMotorImportJobMappings(params.jobId, params.sheetConfigs, params.columnMappings);
  }

  reportApplyProgress({
    phase: "apply",
    percent: 1,
    message: "Подготовка…",
  });

  const freshJob = (await getMotorImportJobAdmin(params.jobId))!;
  const hasStoredRows =
    (freshJob.rowCount ?? 0) > 0 ||
    freshJob.rowsStoredInSubcollection ||
    (freshJob.engineRows?.length ?? 0) > 0;

  if (params.engineRows?.length && !hasStoredRows) {
    reportApplyProgress({
      phase: "apply",
      percent: 2,
      message: "Сохраняем строки…",
    });
    await persistMotorImportEngineRows(params.jobId, params.engineRows, job.stats);
  }

  try {
    reportApplyProgress({
      phase: "apply",
      percent: 3,
      message: "Читаем файл…",
    });

    const freshJobAfterPersist = (await getMotorImportJobAdmin(params.jobId))!;
    const rawEngineRows =
      params.engineRows ?? (await loadMotorImportEngineRowsAdmin(freshJobAfterPersist));
    const engineRows = prepareMagicImportRowsForCommit(rawEngineRows);
    const sheetConfigs = params.sheetConfigs ?? freshJobAfterPersist.sheetConfigs;
    const columnMappings = params.columnMappings ?? freshJobAfterPersist.columnMappings;

    const expectedRows =
      freshJobAfterPersist.rowCount ?? freshJobAfterPersist.stats.totalEngineRows ?? 0;
    if (engineRows.length === 0 && expectedRows > 0) {
      throw new Error("Строки импорта не найдены. Повторите анализ файла.");
    }

    if (!freshJobAfterPersist.storagePath) {
      throw new Error("Файл импорта не найден");
    }

    const buffer = await downloadMotorImportFile(freshJobAfterPersist.storagePath);
    const sheets = readExcelSheetsFromBuffer(buffer);

    reportApplyProgress({
      phase: "apply",
      percent: 5,
      message: "Загружаем базу…",
    });

    const context = await loadMotorImportServerContext(params.companyId, params.uid);
    const repos = createAdminMotorImportRepositories(params.uid, params.companyId);

    reportApplyProgress({
      phase: "apply",
      percent: 8,
      message: "Загрузка в базу…",
      current: 0,
      total: countMagicImportRowsReady(engineRows) || undefined,
    });

    let importCancelled = false;
    const checkCancelled = async () => {
      if (importCancelled) return true;
      importCancelled = await isMotorImportJobCancelledAdmin(params.jobId);
      return importCancelled;
    };

    if (await checkCancelled()) {
      return getMotorImportJobAdmin(params.jobId);
    }

    const result = await commitMotorExcelImport({
      uid: params.uid,
      companyId: params.companyId,
      repository: repos.motorRepository as Parameters<typeof commitMotorExcelImport>[0]["repository"],
      catalogRepository: repos.catalogRepository as Parameters<typeof commitMotorExcelImport>[0]["catalogRepository"],
      specificCategoryRepository:
        repos.specificCategoryRepository as Parameters<typeof commitMotorExcelImport>[0]["specificCategoryRepository"],
      existingMotors: context.existingMotors,
      existingBrands: context.existingBrands,
      existingEngines: context.existingEngines,
      existingSpecificCategories: context.existingSpecificCategories,
      sheets,
      sheetConfigs,
      columnMappings,
      selectedEngineRows: engineRows,
      shouldCancel: () => importCancelled,
      onProgress: (progress) => {
        if (progress.applied > 0 && progress.applied % 12 === 0) {
          void checkCancelled();
        }
        void persistMotorImportRollbackSnapshot(params.jobId, {
          createdMotorIds: progress.createdMotorIds,
          updatedMotorIds: progress.updatedMotorIds,
          createdBrandIds: progress.createdBrandIds,
          createdEngineIds: progress.createdEngineIds,
        });
        reportApplyProgress({
          phase: "apply",
          percent: Math.max(8, Math.min(99, progress.percent)),
          message: `Загрузка в базу · ${progress.applied}/${progress.total}`,
          current: progress.applied,
          total: progress.total,
        });
      },
    });

    if (await checkCancelled()) {
      const snapshot = {
        createdMotorIds: result.createdMotorIds,
        updatedMotorIds: result.updatedMotorIds,
        createdBrandIds: result.createdBrandIds,
        createdEngineIds: result.createdEngineIds,
      };
      await rollbackMotorImportPartialApply({
        uid: params.uid,
        snapshot,
      });
      await persistMotorImportRollbackSnapshot(params.jobId, {
        createdMotorIds: [],
        updatedMotorIds: snapshot.updatedMotorIds,
        createdBrandIds: [],
        createdEngineIds: [],
      });
      return getMotorImportJobAdmin(params.jobId);
    }

    await markMotorImportJobCompleted(
      params.jobId,
      params.companyId,
      params.uid,
      {
        imported: result.imported,
        updated: result.updated,
        skipped: result.skipped,
        specificRecordsImported: result.specificRecordsImported,
      },
      {
        createdMotorIds: result.createdMotorIds,
        updatedMotorIds: result.updatedMotorIds,
        createdBrandIds: result.createdBrandIds,
        createdEngineIds: result.createdEngineIds,
      },
    );

    return getMotorImportJobAdmin(params.jobId);
  } catch (error) {
    if (await isMotorImportJobCancelledAdmin(params.jobId)) {
      return getMotorImportJobAdmin(params.jobId);
    }
    const message = error instanceof Error ? error.message : "Ошибка загрузки в базу";
    await updateMotorImportJobStatus(params.jobId, "failed", message);
    return getMotorImportJobAdmin(params.jobId);
  }
}

export async function processMotorImportJobOnServer(params: {
  companyId: string;
  uid: string;
  jobId: string;
}): Promise<MotorImportJob | null> {
  const job = await getMotorImportJobAdmin(params.jobId);
  if (!job) return null;

  assertMotorImportCompanyAccess(job, params.companyId);

  if (job.status === "applying") {
    const updatedAt = job.updatedAt?.getTime() ?? 0;
    const stuckMs = Date.now() - updatedAt;
    const percent = job.progress?.percent ?? 0;
    if (stuckMs > 180_000 && percent < 100) {
      await updateMotorImportJobStatus(
        params.jobId,
        "failed",
        "Импорт прервался. Загрузите файл ещё раз.",
      );
      return getMotorImportJobAdmin(params.jobId);
    }
    return job;
  }

  if (job.status === "queued" || job.status === "analyzing") {
    return analyzeMotorImportJobOnServer(params);
  }

  if (job.status === "preview" && canAutoApplyMotorImport(job)) {
    return applyMotorImportJobOnServer(params);
  }

  return job;
}

export async function reanalyzeMotorImportJobOnServer(params: {
  companyId: string;
  uid: string;
  jobId: string;
  manualSheetMappings: Record<string, MotorSheetMappingResult>;
}): Promise<MotorImportJob | null> {
  const job = await getMotorImportJobAdmin(params.jobId);
  if (!job?.storagePath) return null;

  assertMotorImportCompanyAccess(job, params.companyId);

  await updateMotorImportJobStatus(params.jobId, "analyzing");
  await updateMotorImportJobProgress(params.jobId, {
    phase: "analyze",
    percent: 5,
    message: "Пересчитываем листы…",
  });

  try {
    const buffer = await downloadMotorImportFile(job.storagePath);
    const sheets = readExcelSheetsFromBuffer(buffer);
    const context = await loadMotorImportServerContext(params.companyId, params.uid);

    const preview = await runMotorImportPreviewPipeline({
      companyId: params.companyId,
      sheets,
      existingMotors: context.existingMotors,
      existingBrands: context.existingBrands,
      existingEngines: context.existingEngines,
      existingSpecificCategories: context.existingSpecificCategories,
      useAi: true,
      magicImport: true,
      manualSheetMappings: params.manualSheetMappings,
      onProgress: (progress) => {
        void updateMotorImportJobProgress(params.jobId, {
          phase: "analyze",
          percent: progress.percent,
          message: progress.message,
        });
      },
    });

    const sheetConfigs = Object.values(preview.sheetMappings).map((item) => item.config);
    const columnMappings = Object.fromEntries(
      Object.entries(preview.sheetMappings).map(([id, item]) => [id, item.columnMapping]),
    );

    await completeMotorImportAnalyze({
      jobId: params.jobId,
      companyId: params.companyId,
      sourceFileName: job.sourceFileName,
      sheetConfigs,
      columnMappings,
      engineRows: preview.engineRows,
      stats: preview.stats,
      quickImport: preview.quickImport ?? false,
      aiNotes: preview.aiNotes,
      specificSheetsPreview: preview.specificSheets.map((item) => ({
        configId: item.configId,
        sheetName: item.sheetName,
        categoryName: item.categoryName,
        rowCount: item.rowCount,
      })),
    });

    return getMotorImportJobAdmin(params.jobId);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Ошибка пересчёта листов";
    await updateMotorImportJobStatus(params.jobId, "failed", message);
    return getMotorImportJobAdmin(params.jobId);
  }
}
