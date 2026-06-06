"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useSearchParams } from "next/navigation";

import { applyMotorImportJobUseCase } from "@/application/use-cases/motors/apply-motor-import-job";
import { createMotorImportJobUseCase } from "@/application/use-cases/motors/create-motor-import-job";
import { useWorkspace } from "@/components/layout/workspace-context";
import { MotorImportHistoryPanel } from "@/components/motors/import/motor-import-history-panel";
import { MotorImportWizard } from "@/components/motors/import/motor-import-wizard";
import { useMotorExcelIoBridge } from "@/components/motors/motor-excel-io-bridge";
import { MotorExcelImportResultDialog } from "@/components/motors/motor-excel-import-result-dialog";
import { useAuth } from "@/components/providers/auth-provider";
import { useEffectiveCatalog } from "@/hooks/use-effective-catalog";
import { useMotorsRealtime } from "@/hooks/use-motors-realtime";
import { useUserPreferences } from "@/hooks/use-user-preferences";
import { useSpecificCategoriesRealtime } from "@/hooks/use-specific-categories-realtime";
import { can } from "@/lib/auth/permissions";
import { normalizeCompanyId } from "@/lib/company-id";
import { readExcelSheets } from "@/lib/motors/excel-import";
import { MotorExcelImportResult, ExcelSheetData } from "@/lib/motors/excel-types";
import { MotorImportPreviewResult } from "@/lib/motors/import/types";
import { createCatalogRepository } from "@/infrastructure/firestore/catalog-repository";
import { createMotorImportRepository } from "@/infrastructure/firestore/motor-import-repository";
import { createMotorRepository } from "@/infrastructure/firestore/motor-repository";
import { createSpecificCategoryRepository } from "@/infrastructure/firestore/specific-category-repository";

const motorRepository = createMotorRepository();
const catalogRepository = createCatalogRepository();
const specificCategoryRepository = createSpecificCategoryRepository();
const motorImportRepository = createMotorImportRepository();

export function MotorImportHost() {
  const searchParams = useSearchParams();
  const { profile } = useAuth();
  const workspace = useWorkspace();
  const {
    motorImportProgress,
    registerImportIslandHandler,
    registerMotorImportPicker,
    setMotorImportReviewPending,
    triggerSync,
  } = workspace;

  const companyId = normalizeCompanyId(profile?.companyId);
  const uid = profile?.id ?? "";
  const canEdit = can(profile, "inventory_edit");
  const { preferences } = useUserPreferences(uid);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [importResult, setImportResult] = useState<MotorExcelImportResult | null>(null);
  const [importDialogOpen, setImportDialogOpen] = useState(false);
  const [importWizardOpen, setImportWizardOpen] = useState(false);
  const [importHistoryOpen, setImportHistoryOpen] = useState(false);
  const [importSheets, setImportSheets] = useState<ExcelSheetData[]>([]);
  const [importSourceFileName, setImportSourceFileName] = useState<string | undefined>();
  const [importResumeSession, setImportResumeSession] = useState<{
    jobId: string;
    preview: MotorImportPreviewResult;
  } | null>(null);

  const { brands, engines } = useEffectiveCatalog(catalogRepository, motorRepository, uid, companyId, {
    loadMotorsForCatalog: true,
  });
  const specificCategories = useSpecificCategoriesRealtime(specificCategoryRepository, companyId);

  const allMotorsQuery = useMotorsRealtime(motorRepository, {
    uid,
    companyId,
    availability: "all",
    includeDeleted: preferences.importExport.includeDeleted,
  });

  const handleImportFile = useCallback(async (file: File) => {
    const sheets = await readExcelSheets(file);
    setImportSheets(sheets);
    setImportSourceFileName(file.name);
    setImportResumeSession(null);
    setImportWizardOpen(false);
  }, []);

  useMotorExcelIoBridge({
    uid,
    companyId,
    canEdit,
    motors: allMotorsQuery.data ?? [],
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
    registerImportIslandHandler(() => {
      if (motorImportProgress) return;
      if (importSheets.length > 0 || importResumeSession) {
        setImportWizardOpen(true);
        return;
      }
      fileInputRef.current?.click();
    });
    return () => registerImportIslandHandler(null);
  }, [importResumeSession, importSheets.length, motorImportProgress, registerImportIslandHandler]);

  useEffect(() => {
    if (motorImportProgress) {
      setImportWizardOpen(false);
    }
  }, [motorImportProgress]);

  useEffect(() => {
    const shouldOpen =
      searchParams.get("import") === "open" ||
      searchParams.get("action") === "import";
    if (!shouldOpen) return;
    if (importSheets.length > 0 || importResumeSession) {
      setImportWizardOpen(true);
    }
  }, [importResumeSession, importSheets.length, searchParams]);

  if (!canEdit || !uid || !companyId) {
    return null;
  }

  return (
    <>
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

      {importSheets.length > 0 ? (
        <MotorImportWizard
          key={importResumeSession?.jobId ?? importSheets.map((sheet) => sheet.name).join("|")}
          sheets={importSheets}
          sourceFileName={importSourceFileName}
          open={importWizardOpen}
          onOpenChange={setImportWizardOpen}
          onDismiss={() => {
            setImportSheets([]);
            setImportSourceFileName(undefined);
            setImportResumeSession(null);
            setMotorImportReviewPending(false);
          }}
          onReviewPending={setMotorImportReviewPending}
          useAi
          resumeSession={importResumeSession}
          onOpenHistory={() => setImportHistoryOpen(true)}
          onAnalyze={async (input) =>
            createMotorImportJobUseCase(motorImportRepository, {
              companyId,
              sourceFileName: input.sourceFileName ?? importSourceFileName,
              sheets: input.sheets,
              existingMotors: allMotorsQuery.data ?? [],
              existingBrands: brands,
              existingEngines: engines,
              existingSpecificCategories: specificCategories,
              createdByUserId: uid,
              useAi: true,
              onProgress: input.onProgress,
            })
          }
          onApply={async (input) => {
            const sheetConfigs = Object.values(input.preview.sheetMappings).map((item) => item.config);
            const columnMappings = Object.fromEntries(
              Object.entries(input.preview.sheetMappings).map(([id, item]) => [id, item.columnMapping]),
            );
            return applyMotorImportJobUseCase(motorImportRepository, {
              companyId,
              jobId: input.jobId,
              uid,
              sheets: input.preview.sheets.length > 0 ? input.preview.sheets : importSheets,
              sheetConfigs,
              columnMappings,
              engineRows: input.preview.engineRows,
              repository: motorRepository,
              catalogRepository,
              specificCategoryRepository,
              existingMotors: allMotorsQuery.data ?? [],
              existingBrands: brands,
              existingEngines: engines,
              existingSpecificCategories: specificCategories,
              actorUserId: uid,
              sourceFileName: importSourceFileName,
              onProgress: input.onProgress,
              shouldCancel: input.shouldCancel,
            });
          }}
          onComplete={async (result) => {
            setImportResult(result);
            setImportDialogOpen(true);
            setImportSheets([]);
            setImportSourceFileName(undefined);
            setImportResumeSession(null);
            await triggerSync();
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

      <MotorExcelImportResultDialog
        result={importResult}
        open={importDialogOpen}
        onOpenChange={setImportDialogOpen}
      />
    </>
  );
}
