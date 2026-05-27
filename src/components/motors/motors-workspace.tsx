"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { LayoutGrid, X } from "lucide-react";

import { sellMotorWithFinancialOperationUseCase } from "@/application/use-cases/sell-motor-with-financial-operation";
import { unsellMotorWithFinancialOperationUseCase } from "@/application/use-cases/unsell-motor-with-financial-operation";
import { useWorkspace } from "@/components/layout/workspace-context";
import { useMotorSyncBridge } from "@/components/motors/motor-sync-bridge";
import { useMotorExcelIoBridge } from "@/components/motors/motor-excel-io-bridge";
import { MotorExcelImportResultDialog } from "@/components/motors/motor-excel-import-result-dialog";
import { MotorExcelImportWizard } from "@/components/motors/motor-excel-import-wizard";
import { MotorsExcelGrid } from "@/components/motors/motors-excel-grid";
import { MotorsGridSkeleton } from "@/components/motors/motors-grid-skeleton";
import { SellMotorDialog } from "@/components/motors/sell-motor-dialog";
import { useAuth } from "@/components/providers/auth-provider";
import { EmptyState } from "@/components/ui/empty-state";
import { Button } from "@/components/ui/button";
import { MotorEntity } from "@/domain/motor";
import { useDeepAction } from "@/hooks/use-deep-action";
import { useEffectiveCatalog } from "@/hooks/use-effective-catalog";
import { useMotorsRealtime } from "@/hooks/use-motors-realtime";
import { useUserPreferences } from "@/hooks/use-user-preferences";
import { can } from "@/lib/auth/permissions";
import { normalizeCompanyId } from "@/lib/company-id";
import { userCopy } from "@/lib/user-copy";
import { deepActionRoutes, type DeepAction } from "@/lib/navigation/deep-actions";
import { MotorExcelImportResult } from "@/lib/motors/excel-types";
import { readExcelSheets } from "@/lib/motors/excel-import";
import type { ExcelSheetData } from "@/lib/motors/excel-types";
import { cn } from "@/lib/utils";
import { createCatalogRepository } from "@/infrastructure/firestore/catalog-repository";
import { createFinancialOperationRepository } from "@/infrastructure/firestore/financial-operation-repository";
import { createMotorRepository } from "@/infrastructure/firestore/motor-repository";
import { createSpecificCategoryRepository } from "@/infrastructure/firestore/specific-category-repository";
import { useSpecificCategoriesRealtime } from "@/hooks/use-specific-categories-realtime";

const motorRepository = createMotorRepository();
const financialRepository = createFinancialOperationRepository();
const catalogRepository = createCatalogRepository();
const specificCategoryRepository = createSpecificCategoryRepository();

export function MotorsWorkspace({ soldOnly = false }: { soldOnly?: boolean }) {
  const { profile } = useAuth();
  const workspace = useWorkspace();
  const [sellDialog, setSellDialog] = useState<{ motor: MotorEntity; mode: "sell" | "unsell" } | null>(
    null,
  );
  const [cloudPending, setCloudPending] = useState(false);
  const [importResult, setImportResult] = useState<MotorExcelImportResult | null>(null);
  const [importDialogOpen, setImportDialogOpen] = useState(false);
  const [importWizardOpen, setImportWizardOpen] = useState(false);
  const [importSheets, setImportSheets] = useState<ExcelSheetData[]>([]);
  const [importLoadError, setImportLoadError] = useState<string | null>(null);
  const [sellHintVisible, setSellHintVisible] = useState(false);
  const [addHintVisible, setAddHintVisible] = useState(false);
  const [deepActionError, setDeepActionError] = useState<string | null>(null);

  const companyId = normalizeCompanyId(profile?.companyId);
  const uid = profile?.id ?? "";
  const canEdit = can(profile, "inventory_edit");
  const { preferences } = useUserPreferences(uid);
  const {
    triggerMotorExport,
    triggerMotorImportPicker,
    triggerSync,
  } = useWorkspace();

  const { brands, engines } = useEffectiveCatalog(catalogRepository, motorRepository, uid, companyId, {
    loadMotorsForCatalog: true,
  });
  const specificCategories = useSpecificCategoriesRealtime(specificCategoryRepository, companyId);

  const selectedBrandName = useMemo(
    () => brands.find((brand) => brand.localId === workspace.selectedBrandLocalId)?.name,
    [brands, workspace.selectedBrandLocalId],
  );

  const selectedEngineCode = useMemo(
    () => engines.find((engine) => engine.localId === workspace.selectedEngineLocalId)?.code,
    [engines, workspace.selectedEngineLocalId],
  );

  const motorsQuery = useMotorsRealtime(motorRepository, {
    uid,
    companyId,
    soldOnly,
    availability: soldOnly ? "sold" : workspace.availability,
    search: workspace.search,
    brandName: selectedBrandName,
    engineCode: selectedEngineCode,
  });

  const allMotorsQuery = useMotorsRealtime(motorRepository, {
    uid,
    companyId,
    availability: "all",
    includeDeleted: preferences.importExport.includeDeleted,
  });

  const rowData = motorsQuery.data ?? [];
  const isGridReady = !motorsQuery.isBootstrapping;
  const { setCounts } = workspace;
  const motorCount = motorsQuery.data?.length ?? 0;

  useMotorSyncBridge({
    uid,
    companyId,
    repository: motorRepository,
    motors: rowData,
    localDirty: cloudPending,
  });

  useMotorExcelIoBridge({
    uid,
    companyId,
    canEdit,
    motors: rowData,
    importExportPrefs: preferences.importExport,
    onImportFile: async (file) => {
      setImportLoadError(null);
      try {
        const sheets = await readExcelSheets(file);
        setImportSheets(sheets);
        setImportWizardOpen(true);
      } catch (error) {
        setImportLoadError(error instanceof Error ? error.message : "Не удалось прочитать Excel");
      }
    },
  });

  useEffect(() => {
    setCounts(motorCount, motorCount);
  }, [motorCount, setCounts]);

  const handleDeepAction = useCallback(
    async (action: DeepAction) => {
      setDeepActionError(null);

      switch (action) {
        case "import": {
          if (!triggerMotorImportPicker()) {
            setDeepActionError("Импорт недоступен на этой странице");
          }
          break;
        }
        case "export": {
          try {
            await triggerMotorExport();
          } catch (error) {
            setDeepActionError(error instanceof Error ? error.message : "Не удалось экспортировать");
          }
          break;
        }
        case "sync": {
          const synced = await triggerSync();
          if (!synced) {
            setDeepActionError("Дождитесь загрузки таблицы моторов");
          }
          break;
        }
        case "sell":
          setSellHintVisible(true);
          break;
        case "add":
          setAddHintVisible(true);
          break;
        default:
          break;
      }
    },
    [triggerMotorExport, triggerMotorImportPicker, triggerSync],
  );

  useDeepAction({ onAction: handleDeepAction });

  async function confirmSellOperation(payload: {
    amount: number;
    account: "cashbox" | "kaspi";
    paymentMethod: "cash" | "transfer" | "mixed";
    comment: string;
  }) {
    if (!sellDialog || !uid || !companyId || !profile) return;
    const { motor, mode } = sellDialog;

    if (mode === "sell") {
      await sellMotorWithFinancialOperationUseCase(motorRepository, financialRepository, {
        uid,
        motor,
        companyId,
        createdByUserId: profile.id,
        amount: payload.amount,
        account: payload.account,
        paymentMethod: payload.paymentMethod,
        comment: payload.comment,
      });
      return;
    }

    await unsellMotorWithFinancialOperationUseCase(motorRepository, financialRepository, {
      uid,
      motor,
      companyId,
      createdByUserId: profile.id,
      amount: payload.amount,
      account: payload.account,
      paymentMethod: payload.paymentMethod,
      comment: payload.comment,
    });
  }

  async function batchSellMotors(motors: MotorEntity[]) {
    if (!uid || !companyId || !profile) return;
    setCloudPending(true);
    try {
      for (const motor of motors) {
        if (motor.soldDate) continue;
        await sellMotorWithFinancialOperationUseCase(motorRepository, financialRepository, {
          uid,
          motor,
          companyId,
          createdByUserId: profile.id,
          amount: 0,
          account: "cashbox",
          paymentMethod: "cash",
          comment: "Продажа мотора (web)",
        });
      }
    } finally {
      setCloudPending(false);
    }
  }

  async function batchUnsellMotors(motors: MotorEntity[]) {
    if (!uid || !companyId || !profile) return;
    setCloudPending(true);
    try {
      for (const motor of motors) {
        if (!motor.soldDate) continue;
        await unsellMotorWithFinancialOperationUseCase(motorRepository, financialRepository, {
          uid,
          motor,
          companyId,
          createdByUserId: profile.id,
          amount: 0,
          account: "cashbox",
          paymentMethod: "cash",
          comment: "Возврат продажи мотора (web)",
        });
      }
    } finally {
      setCloudPending(false);
    }
  }

  if (motorsQuery.isError) {
    return (
      <div className="flex h-full flex-col items-center justify-center gap-2 p-6 text-center text-sm">
        <p className="text-destructive">{motorsQuery.errorMessage ?? userCopy.motors.accessError}</p>
        <p className="max-w-md text-muted-foreground">{userCopy.motors.accessHint}</p>
      </div>
    );
  }

  const showMotorsEmptyState = !soldOnly && isGridReady && rowData.length === 0;

  if (soldOnly && isGridReady && rowData.length === 0) {
    return (
      <div className="flex h-full flex-col items-center justify-center gap-2 px-6 text-center">
        <p className="text-sm font-medium">Проданных моторов пока нет</p>
        <p className="max-w-md text-sm text-muted-foreground">
          Отметьте продажу в разделе «Все моторы» — запись появится здесь автоматически.
        </p>
      </div>
    );
  }

  return (
    <div className="relative flex h-full min-h-0 flex-1 flex-col">
      {sellHintVisible ? (
        <div className="mx-3 mt-3 flex items-start gap-3 rounded-lg border border-primary/20 bg-primary/5 px-3 py-2 text-sm">
          <p className="flex-1 text-muted-foreground">
            Выберите мотор в таблице и отметьте продажу через контекстное меню.
          </p>
          <Button
            type="button"
            variant="ghost"
            size="icon-sm"
            onClick={() => setSellHintVisible(false)}
            aria-label="Закрыть подсказку"
          >
            <X className="size-4" />
          </Button>
        </div>
      ) : null}
      {addHintVisible ? (
        <div className="mx-3 mt-3 flex items-start gap-3 rounded-lg border border-border/60 bg-muted/30 px-3 py-2 text-sm">
          <p className="flex-1 text-muted-foreground">
            Начните ввод в первой пустой строке таблицы — новый мотор сохранится автоматически.
          </p>
          <Button
            type="button"
            variant="ghost"
            size="icon-sm"
            onClick={() => setAddHintVisible(false)}
            aria-label="Закрыть подсказку"
          >
            <X className="size-4" />
          </Button>
        </div>
      ) : null}
      {deepActionError ? (
        <div className="mx-3 mt-3 rounded-md border border-destructive/40 bg-destructive/10 px-3 py-2 text-xs text-destructive">
          {deepActionError}
        </div>
      ) : null}
      {motorsQuery.isBootstrapping ? <MotorsGridSkeleton /> : null}
      {showMotorsEmptyState ? (
        <div className="flex flex-1 flex-col p-6">
          <EmptyState
            icon={LayoutGrid}
            title="Моторов пока нет"
            description="Импортируйте Excel или синхронизируйте данные с Mac, чтобы начать работу с таблицей."
            primaryAction={{
              label: "Импорт из Excel",
              href: deepActionRoutes.import(),
            }}
            secondaryAction={{
              label: "Синхронизировать с Mac",
              href: deepActionRoutes.sync(),
              variant: "outline",
            }}
          />
        </div>
      ) : (
        <div
          className={cn(
            "flex min-h-0 flex-1 flex-col transition-[opacity,transform] duration-500 ease-out motion-reduce:transition-none",
            isGridReady ? "opacity-100 translate-y-0" : "pointer-events-none absolute inset-0 opacity-0 translate-y-1",
          )}
        >
          {isGridReady ? (
            <MotorsExcelGrid
              motors={rowData}
              companyId={companyId}
              uid={uid}
              canEdit={canEdit}
              soldOnly={soldOnly}
              repository={motorRepository}
              onCloudPendingChange={setCloudPending}
              onSell={(motor) => setSellDialog({ motor, mode: "sell" })}
              onUnsell={(motor) => setSellDialog({ motor, mode: "unsell" })}
              onBatchSell={(motors) => void batchSellMotors(motors)}
              onBatchUnsell={(motors) => void batchUnsellMotors(motors)}
            />
          ) : null}
        </div>
      )}

      <SellMotorDialog
        motor={sellDialog?.motor ?? null}
        mode={sellDialog?.mode ?? "sell"}
        open={Boolean(sellDialog)}
        onOpenChange={(open) => {
          if (!open) setSellDialog(null);
        }}
        onConfirm={confirmSellOperation}
      />

      {importLoadError ? (
        <div className="absolute top-3 right-3 z-20 rounded-md border border-destructive/40 bg-destructive/10 px-3 py-2 text-xs text-destructive">
          {importLoadError}
        </div>
      ) : null}

      <MotorExcelImportWizard
        key={importSheets.map((sheet) => sheet.name).join("|")}
        sheets={importSheets}
        open={importWizardOpen}
        onOpenChange={(open) => {
          setImportWizardOpen(open);
          if (!open) setImportSheets([]);
        }}
        uid={uid}
        companyId={companyId}
        repository={motorRepository}
        catalogRepository={catalogRepository}
        specificCategoryRepository={specificCategoryRepository}
        existingMotors={allMotorsQuery.data ?? []}
        existingBrands={brands}
        existingEngines={engines}
        existingSpecificCategories={specificCategories}
        onComplete={async (result) => {
          setImportResult(result);
          setImportDialogOpen(true);
          await workspace.triggerSync();
        }}
      />

      <MotorExcelImportResultDialog
        result={importResult}
        open={importDialogOpen}
        onOpenChange={setImportDialogOpen}
      />
    </div>
  );
}
