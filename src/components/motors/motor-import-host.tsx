"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useSearchParams } from "next/navigation";

import { useWorkspace } from "@/components/layout/workspace-context";
import { MotorImportHistoryPanel } from "@/components/motors/import/motor-import-history-panel";
import { MotorImportWizard } from "@/components/motors/import/motor-import-wizard";
import { MotorImportJobSync } from "@/components/motors/motor-import-job-sync";
import { useMotorExcelIoBridge } from "@/components/motors/motor-excel-io-bridge";
import { useAuth } from "@/components/providers/auth-provider";
import { useToast } from "@/components/ui/toast-provider";
import { useMotorsRealtime } from "@/hooks/use-motors-realtime";
import { useSpecificCategoriesRealtime } from "@/hooks/use-specific-categories-realtime";
import { useUserPreferences } from "@/hooks/use-user-preferences";
import { MotorImportJob } from "@/domain/motor-import";
import { can } from "@/lib/auth/permissions";
import { normalizeCompanyId } from "@/lib/company-id";
import { ExcelSheetData } from "@/lib/motors/excel-types";
import { MotorImportPreviewResult } from "@/lib/motors/import/types";
import {
  applyMotorImportJobRemote,
  fetchMotorImportPreviewRemote,
  reanalyzeMotorImportJobRemote,
  startMotorImportJob,
} from "@/lib/motors/motor-import-api.client";
import { previewFromMotorImportJob } from "@/lib/motors/import/preview-from-job";
import {
  clearMotorImportSession,
  writeMotorImportSession,
} from "@/lib/motors/import/motor-import-session";
import { createMotorImportRepository } from "@/infrastructure/firestore/motor-import-repository";
import { createMotorRepository } from "@/infrastructure/firestore/motor-repository";
import { createSpecificCategoryRepository } from "@/infrastructure/firestore/specific-category-repository";
import type { MotorImportReviewSnapshot } from "@/components/layout/workspace-context";

const motorImportRepository = createMotorImportRepository();
const motorRepository = createMotorRepository();
const specificCategoryRepository = createSpecificCategoryRepository();

function placeholderPreviewFromReview(review: MotorImportReviewSnapshot): MotorImportPreviewResult {
  return {
    sheets: [],
    sheetMappings: {},
    engineRows: [],
    specificSheets: [],
    stats: {
      totalEngineRows: review.totalMotors,
      validEngineRows: review.validMotors,
      specificSheets: review.specificSheets,
      duplicates: 0,
      errors: 0,
      warnings: 0,
    },
    quickImport: false,
  };
}

function buildInstantPreview(input: {
  cached?: MotorImportPreviewResult;
  job?: MotorImportJob | null;
  review?: MotorImportReviewSnapshot | null;
}): MotorImportPreviewResult {
  if (input.cached?.engineRows.length) return input.cached;
  if (input.job) return previewFromMotorImportJob(input.job, input.cached?.engineRows ?? []);
  if (input.cached) return input.cached;
  if (input.review) return placeholderPreviewFromReview(input.review);
  return {
    sheets: [],
    sheetMappings: {},
    engineRows: [],
    specificSheets: [],
    stats: {
      totalEngineRows: 0,
      validEngineRows: 0,
      specificSheets: 0,
      duplicates: 0,
      errors: 0,
      warnings: 0,
    },
    quickImport: false,
  };
}

export function MotorImportHost() {
  const searchParams = useSearchParams();
  const { profile } = useAuth();
  const { toast } = useToast();
  const workspace = useWorkspace();
  const {
    motorImportProgress,
    motorImportReview,
    motorImportReviewPending,
    registerImportIslandHandler,
    registerMotorImportPicker,
    setMotorImportProgress,
    setMotorImportPendingJobId,
    setMotorImportReviewPending,
    registerMotorImportCancel,
    triggerSync,
  } = workspace;

  const companyId = normalizeCompanyId(profile?.companyId);
  const uid = profile?.id ?? "";
  const canEdit = can(profile, "inventory_edit");
  const { preferences } = useUserPreferences(uid);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const pendingPreviewJobRef = useRef<MotorImportJob | null>(null);
  const previewCacheRef = useRef<Map<string, MotorImportPreviewResult>>(new Map());
  const hydrateInFlightRef = useRef<string | null>(null);

  const motorsQuery = useMotorsRealtime(motorRepository, {
    uid,
    companyId,
    availability: "all",
    includeDeleted: preferences.importExport.includeDeleted,
    enabled: Boolean(canEdit && uid && companyId),
  });

  const specificCategories = useSpecificCategoriesRealtime(
    specificCategoryRepository,
    companyId,
    Boolean(canEdit && companyId),
  );

  const [importWizardOpen, setImportWizardOpen] = useState(false);
  const [importHistoryOpen, setImportHistoryOpen] = useState(false);
  const [importSourceFileName, setImportSourceFileName] = useState<string | undefined>();
  const [importResumeSession, setImportResumeSession] = useState<{
    jobId: string;
    preview: MotorImportPreviewResult;
  } | null>(null);
  const importResumeSessionRef = useRef(importResumeSession);
  const motorImportReviewRef = useRef(motorImportReview);
  importResumeSessionRef.current = importResumeSession;
  motorImportReviewRef.current = motorImportReview;

  const hydratePreview = useCallback(async (jobId: string, job?: MotorImportJob | null) => {
    if (hydrateInFlightRef.current === jobId) return;

    const cached = previewCacheRef.current.get(jobId);
    if (cached && cached.engineRows.length > 0) return;

    hydrateInFlightRef.current = jobId;
    try {
      const remote = await fetchMotorImportPreviewRemote(jobId);
      if (remote.ok) {
        previewCacheRef.current.set(jobId, remote.preview);
        setImportResumeSession((current) =>
          current?.jobId === jobId ? { jobId, preview: remote.preview } : current,
        );
        return;
      }

      const resolvedJob =
        job ??
        pendingPreviewJobRef.current?.id === jobId
          ? pendingPreviewJobRef.current
          : await motorImportRepository.getById(jobId);
      if (!resolvedJob) return;

      pendingPreviewJobRef.current = resolvedJob;
      const engineRows = await motorImportRepository.loadEngineRows(resolvedJob);
      const preview = previewFromMotorImportJob(resolvedJob, engineRows);
      previewCacheRef.current.set(jobId, preview);
      setImportResumeSession((current) =>
        current?.jobId === jobId ? { jobId, preview } : current,
      );

      if (engineRows.length === 0 && (resolvedJob.rowCount ?? resolvedJob.stats.totalEngineRows) > 0) {
        toast({
          title: "Не все строки загрузились",
          description: remote.error ?? "Подождите и откройте импорт снова",
          variant: "error",
        });
      }
    } finally {
      if (hydrateInFlightRef.current === jobId) {
        hydrateInFlightRef.current = null;
      }
    }
  }, [toast]);

  const openImportWizardInstant = useCallback(
    (jobId: string, options?: { job?: MotorImportJob | null; review?: MotorImportReviewSnapshot | null }) => {
      const cached = previewCacheRef.current.get(jobId);
      const pendingJob =
        options?.job ??
        (pendingPreviewJobRef.current?.id === jobId ? pendingPreviewJobRef.current : null);
      const review =
        options?.review ?? (motorImportReview?.jobId === jobId ? motorImportReview : null);
      const preview = buildInstantPreview({ cached, job: pendingJob, review });

      setImportSourceFileName(
        pendingJob?.sourceFileName ?? review?.fileName ?? undefined,
      );
      setImportResumeSession({ jobId, preview });
      setImportWizardOpen(true);
      setMotorImportReviewPending(false);

      const needsHydration =
        preview.engineRows.length === 0 && (preview.stats.totalEngineRows ?? 0) > 0;
      if (needsHydration) {
        void hydratePreview(jobId, pendingJob);
      }
    },
    [hydratePreview, motorImportReview, setMotorImportReviewPending],
  );

  const loadJobIntoWizard = useCallback(
    (job: MotorImportJob) => {
      pendingPreviewJobRef.current = job;
      openImportWizardInstant(job.id, { job });
    },
    [openImportWizardInstant],
  );

  const resumeImportWizard = useCallback(
    (jobId: string) => {
      if (importResumeSession?.jobId === jobId) {
        setImportWizardOpen(true);
        setMotorImportReviewPending(false);
        return;
      }
      openImportWizardInstant(jobId);
    },
    [importResumeSession?.jobId, openImportWizardInstant, setMotorImportReviewPending],
  );

  const handleImportFile = useCallback(async (file: File) => {
    setImportWizardOpen(false);
    setImportResumeSession(null);
    setImportSourceFileName(file.name);
    setMotorImportProgress({
      phase: "analyze",
      percent: 1,
      message: "Загружаем файл на сервер…",
      fileName: file.name,
    });

    const result = await startMotorImportJob(file);
    if (!result.ok) {
      setMotorImportProgress(null);
      toast({
        title: "Не удалось начать импорт",
        description: result.error,
        variant: "error",
      });
      return;
    }

    setMotorImportProgress({
      phase: "analyze",
      percent: 3,
      message: "Файл загружен, анализ на сервере…",
      fileName: file.name,
      jobId: result.jobId,
    });
    setMotorImportPendingJobId(result.jobId);
    writeMotorImportSession({
      jobId: result.jobId,
      fileName: file.name,
      startedAt: Date.now(),
    });
  }, [setMotorImportPendingJobId, setMotorImportProgress, toast]);

  useMotorExcelIoBridge({
    uid,
    companyId,
    canEdit,
    motors: motorsQuery.data ?? [],
    importExportPrefs: preferences.importExport,
    onImportFile: handleImportFile,
  });

  useEffect(() => {
    registerMotorImportPicker(() => {
      fileInputRef.current?.click();
    });
    return () => registerMotorImportPicker(null);
  }, [registerMotorImportPicker]);

  useEffect(() => {
    if (!motorImportReview?.jobId) return;
    const jobId = motorImportReview.jobId;

    if (!pendingPreviewJobRef.current || pendingPreviewJobRef.current.id !== jobId) {
      void motorImportRepository.getById(jobId).then((job) => {
        if (job) pendingPreviewJobRef.current = job;
      });
    }

    const cached = previewCacheRef.current.get(jobId);
    if (cached && cached.engineRows.length > 0) return;

    void hydratePreview(
      jobId,
      pendingPreviewJobRef.current?.id === jobId ? pendingPreviewJobRef.current : null,
    );
  }, [hydratePreview, motorImportReview?.jobId]);

  useEffect(() => {
    registerMotorImportCancel(() => {
      hydrateInFlightRef.current = null;
      previewCacheRef.current.clear();
      setImportWizardOpen(false);
      setImportResumeSession(null);
      setImportSourceFileName(undefined);
      pendingPreviewJobRef.current = null;
    });
    return () => registerMotorImportCancel(null);
  }, [registerMotorImportCancel]);

  useEffect(() => {
    registerImportIslandHandler(() => {
      if (motorImportProgress && !motorImportReviewPending) return;

      const jobId =
        motorImportReview?.jobId ??
        importResumeSession?.jobId ??
        pendingPreviewJobRef.current?.id ??
        null;

      if (jobId) {
        resumeImportWizard(jobId);
        return;
      }

      fileInputRef.current?.click();
    });
    return () => registerImportIslandHandler(null);
  }, [
    importResumeSession?.jobId,
    motorImportProgress,
    motorImportReview?.jobId,
    motorImportReviewPending,
    registerImportIslandHandler,
    resumeImportWizard,
  ]);

  useEffect(() => {
    if (motorImportProgress && !motorImportReviewPending) {
      setImportWizardOpen(false);
    }
  }, [motorImportProgress, motorImportReviewPending]);

  useEffect(() => {
    const shouldOpen =
      searchParams.get("import") === "open" ||
      searchParams.get("action") === "import";
    if (!shouldOpen) return;
    if (importResumeSession || motorImportReviewPending) {
      setImportWizardOpen(true);
      return;
    }
    fileInputRef.current?.click();
  }, [importResumeSession, motorImportReviewPending, searchParams]);

  if (!canEdit || !uid || !companyId) {
    return null;
  }

  const emptySheets: ExcelSheetData[] = [];

  return (
    <>
      <MotorImportJobSync
        onPreviewReady={(job) => {
          pendingPreviewJobRef.current = job;
          loadJobIntoWizard(job);
        }}
        onCompleted={async () => {
          clearMotorImportSession();
          previewCacheRef.current.clear();
          setImportResumeSession(null);
          setImportSourceFileName(undefined);
          pendingPreviewJobRef.current = null;
          await triggerSync();
        }}
      />

      <input
        ref={fileInputRef}
        type="file"
        accept=".xlsx,.xls,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,application/vnd.ms-excel"
        className="hidden"
        onChange={(event) => {
          const file = event.target.files?.[0];
          event.target.value = "";
          if (file) void handleImportFile(file).catch(() => undefined);
        }}
      />

      {importResumeSession ? (
        <MotorImportWizard
          key={importResumeSession.jobId}
          sheets={emptySheets}
          sourceFileName={importSourceFileName}
          open={importWizardOpen}
          specificCategories={specificCategories}
          onOpenChange={setImportWizardOpen}
          onDismiss={() => {
            setImportSourceFileName(undefined);
            setImportResumeSession(null);
            setMotorImportReviewPending(false);
            pendingPreviewJobRef.current = null;
          }}
          onReviewPending={setMotorImportReviewPending}
          useAi
          resumeSession={importResumeSession}
          onOpenHistory={() => setImportHistoryOpen(true)}
          onAnalyze={async (input) => {
            const jobId = importResumeSession.jobId;
            if (!input.manualSheetMappings) {
              throw new Error("Нет данных для пересчёта");
            }
            const remote = await reanalyzeMotorImportJobRemote({
              jobId,
              manualSheetMappings: input.manualSheetMappings,
            });
            if (!remote.ok) {
              throw new Error(remote.error);
            }
            return {
              jobId: remote.jobId,
              sheets: [],
              sheetMappings: remote.sheetMappings,
              engineRows: remote.engineRows,
              specificSheets: [],
              stats: remote.stats,
              quickImport: remote.quickImport,
            };
          }}
          onApply={async (input) => {
            const sheetConfigs = Object.values(input.preview.sheetMappings).map((item) => item.config);
            const columnMappings = Object.fromEntries(
              Object.entries(input.preview.sheetMappings).map(([id, item]) => [id, item.columnMapping]),
            );
            setMotorImportPendingJobId(input.jobId);
            setMotorImportProgress({
              jobId: input.jobId,
              phase: "apply",
              percent: 1,
              message: "Загружаем моторы в базу…",
              fileName: importSourceFileName,
            });
            const remote = await applyMotorImportJobRemote({
              jobId: input.jobId,
              sheetConfigs,
              columnMappings,
            });
            if (!remote.ok) {
              throw new Error(remote.error);
            }
            return {
              imported: 0,
              updated: 0,
              skipped: 0,
              errors: [],
              specificRecordsImported: 0,
              sheetsProcessed: 0,
              specificCategoriesUpdated: 0,
              cancelled: false,
            };
          }}
          onComplete={async () => {
            setImportResumeSession(null);
            setImportSourceFileName(undefined);
            pendingPreviewJobRef.current = null;
          }}
        />
      ) : null}

      <MotorImportHistoryPanel
        open={importHistoryOpen}
        onOpenChange={setImportHistoryOpen}
        companyId={companyId}
        importRepository={motorImportRepository}
        onResume={(jobId, preview) => {
          setImportResumeSession({ jobId, preview });
          setImportWizardOpen(true);
        }}
      />
    </>
  );
}
