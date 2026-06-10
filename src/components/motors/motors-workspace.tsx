"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import { AnimatePresence, motion } from "framer-motion";
import { LayoutGrid, X } from "lucide-react";

import { sellMotorWithFinancialOperationUseCase } from "@/application/use-cases/sell-motor-with-financial-operation";
import { enqueueMotorSoldEffects } from "@/lib/motors/enqueue-motor-sold-effects";
import { unsellMotorWithFinancialOperationUseCase } from "@/application/use-cases/unsell-motor-with-financial-operation";
import { MotorSaleSuccessOverlay } from "@/components/motors/motor-sale-success-overlay";
import { useWorkspace } from "@/components/layout/workspace-context";
import { buildMotorSearchSuggestions } from "@/components/layout/workspace-search-field";
import { useMotorSyncBridge } from "@/components/motors/motor-sync-bridge";
import { MotorsExcelGrid } from "@/components/motors/motors-excel-grid";
import { MotorsGridSkeleton } from "@/components/motors/motors-grid-skeleton";
import { SellMotorDialog } from "@/components/motors/sell-motor-dialog";
import { useAuth } from "@/components/providers/auth-provider";
import { useBillingGate } from "@/components/billing/billing-gate-provider";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { MotorEntity } from "@/domain/motor";
import { useDeepAction } from "@/hooks/use-deep-action";
import { useEffectiveCatalog } from "@/hooks/use-effective-catalog";
import { useMotorsRealtime } from "@/hooks/use-motors-realtime";
import { useUserPreferences } from "@/hooks/use-user-preferences";
import { can } from "@/lib/auth/permissions";
import { normalizeCompanyId } from "@/lib/company-id";
import { userCopy } from "@/lib/user-copy";
import { type DeepAction } from "@/lib/navigation/deep-actions";
import { cn } from "@/lib/utils";
import { createCatalogRepository } from "@/infrastructure/firestore/catalog-repository";
import { createFinancialOperationRepository } from "@/infrastructure/firestore/financial-operation-repository";
import { createMotorRepository } from "@/infrastructure/firestore/motor-repository";

const motorRepository = createMotorRepository();
const financialRepository = createFinancialOperationRepository();
const catalogRepository = createCatalogRepository();

export function MotorsWorkspace({ soldOnly = false }: { soldOnly?: boolean }) {
  const { profile } = useAuth();
  const { requirePro } = useBillingGate();
  const workspace = useWorkspace();
  const [sellDialog, setSellDialog] = useState<{ motor: MotorEntity; mode: "sell" | "unsell" } | null>(
    null,
  );
  const [cloudPending, setCloudPending] = useState(false);
  const [sellHintVisible, setSellHintVisible] = useState(false);
  const [sellSuccess, setSellSuccess] = useState<{ serialCode: string; amount: number } | null>(null);
  const [deepActionError, setDeepActionError] = useState<string | null>(null);
  const [editorRevealed, setEditorRevealed] = useState(false);

  const companyId = normalizeCompanyId(profile?.companyId);
  const uid = profile?.id ?? "";
  const canEdit = can(profile, "inventory_edit");
  const { preferences } = useUserPreferences(uid);
  const {
    triggerMotorExport,
    triggerMotorImportPicker,
    triggerSync,
  } = useWorkspace();
  const searchParams = useSearchParams();

  const { brands, engines } = useEffectiveCatalog(catalogRepository, motorRepository, uid, companyId, {
    loadMotorsForCatalog: true,
  });

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
  const { setCounts, setSearchSuggestions } = workspace;
  const motorCount = motorsQuery.data?.length ?? 0;
  const showMotorsEmpty =
    isGridReady && motorCount === 0 && !soldOnly && !editorRevealed;

  const revealMotorEditor = useCallback(() => {
    setEditorRevealed(true);
    requestAnimationFrame(() => {
      document.querySelector<HTMLElement>("[data-grid-root]")?.focus();
    });
  }, []);

  useEffect(() => {
    if (motorCount > 0) {
      setEditorRevealed(true);
    }
  }, [motorCount]);

  useMotorSyncBridge({
    uid,
    companyId,
    repository: motorRepository,
    motors: rowData,
    localDirty: cloudPending,
    enabled: isGridReady,
  });

  useEffect(() => {
    const query = searchParams.get("search")?.trim();
    if (query) {
      workspace.setSearch(query);
    }
  }, [searchParams, workspace]);

  const motorSearchSuggestions = useMemo(
    () => buildMotorSearchSuggestions(allMotorsQuery.data ?? []),
    [allMotorsQuery.data],
  );

  useEffect(() => {
    setCounts(motorCount, motorCount);
  }, [motorCount, setCounts]);

  useEffect(() => {
    if (!can(profile, "inventory_view")) {
      setSearchSuggestions([]);
      return;
    }
    setSearchSuggestions(motorSearchSuggestions);
  }, [motorSearchSuggestions, profile, setSearchSuggestions]);

  useEffect(() => () => setSearchSuggestions([]), [setSearchSuggestions]);

  const handleDeepAction = useCallback(
    async (action: DeepAction) => {
      setDeepActionError(null);

      switch (action) {
        case "import": {
          requirePro("import", () => {
            if (!triggerMotorImportPicker()) {
              setDeepActionError("Импорт недоступен на этой странице");
            }
          });
          break;
        }
        case "export": {
          requirePro("export", async () => {
            try {
              await triggerMotorExport();
            } catch (error) {
              setDeepActionError(error instanceof Error ? error.message : "Не удалось экспортировать");
            }
          });
          break;
        }
        case "sync": {
          requirePro("sync", async () => {
            const synced = await triggerSync();
            if (!synced) {
              setDeepActionError("Дождитесь загрузки таблицы моторов");
            }
          });
          break;
        }
        case "sell":
          setSellHintVisible(true);
          break;
        default:
          break;
      }
    },
    [requirePro, triggerMotorExport, triggerMotorImportPicker, triggerSync],
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

      void enqueueMotorSoldEffects(motor, {
        amount: payload.amount,
        account: payload.account,
        paymentMethod: payload.paymentMethod,
        comment: payload.comment,
      });

      setSellSuccess({ serialCode: motor.serialCode, amount: payload.amount });
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
          comment: "Продажа мотора",
        });
        void enqueueMotorSoldEffects(motor, {
          amount: 0,
          account: "cashbox",
          paymentMethod: "cash",
          comment: "Продажа мотора",
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

  if (soldOnly && isGridReady && rowData.length === 0) {
    return (
      <div className="flex h-full flex-col items-center justify-center px-6">
        <EmptyState
          icon={LayoutGrid}
          title={userCopy.motors.soldEmptyTitle}
          description={userCopy.motors.soldEmptyDescription}
          className="max-w-lg border-none bg-transparent"
        />
      </div>
    );
  }

  return (
    <div className="relative flex h-full min-h-0 flex-1 flex-col">
      {deepActionError ? (
        <div className="mx-3 mt-3 shrink-0 rounded-md border border-destructive/40 bg-destructive/10 px-3 py-2 text-xs text-destructive">
          {deepActionError}
        </div>
      ) : null}
      <AnimatePresence mode="wait" initial={false}>
        {showMotorsEmpty ? (
          <motion.div
            key="motors-empty"
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -6 }}
            transition={{ duration: 0.24, ease: [0.22, 1, 0.36, 1] }}
            className="flex min-h-0 flex-1 items-center justify-center px-6 py-10"
          >
            <EmptyState
              icon={LayoutGrid}
              title={userCopy.motors.emptyTitle}
              description={userCopy.motors.emptyDescription}
              primaryAction={
                canEdit
                  ? {
                      label: userCopy.motors.emptyImport,
                      onClick: () =>
                        requirePro("import", () => {
                          if (!triggerMotorImportPicker()) {
                            setDeepActionError("Импорт недоступен на этой странице");
                          }
                        }),
                      variant: "outline",
                    }
                  : undefined
              }
              secondaryAction={
                canEdit
                  ? {
                      label: userCopy.motors.emptyCreate,
                      onClick: revealMotorEditor,
                    }
                  : undefined
              }
              className="max-w-lg border-none bg-transparent shadow-none"
            />
          </motion.div>
        ) : (
          <motion.div
            key="motors-grid"
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.24, ease: [0.22, 1, 0.36, 1] }}
            className="flex min-h-0 flex-1 flex-col"
          >
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
            {motorsQuery.isBootstrapping ? <MotorsGridSkeleton /> : null}
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
                  brands={brands}
                  engines={engines}
                  catalogRepository={catalogRepository}
                  defaultBrandName={selectedBrandName}
                  defaultEngineCode={selectedEngineCode}
                  repository={motorRepository}
                  onCloudPendingChange={setCloudPending}
                  onSell={(motor) => setSellDialog({ motor, mode: "sell" })}
                  onUnsell={(motor) => setSellDialog({ motor, mode: "unsell" })}
                  onBatchSell={(motors) => void batchSellMotors(motors)}
                  onBatchUnsell={(motors) => void batchUnsellMotors(motors)}
                />
              ) : null}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <SellMotorDialog
        motor={sellDialog?.motor ?? null}
        mode={sellDialog?.mode ?? "sell"}
        open={Boolean(sellDialog)}
        onOpenChange={(open) => {
          if (!open) setSellDialog(null);
        }}
        onConfirm={confirmSellOperation}
      />

      <MotorSaleSuccessOverlay
        open={Boolean(sellSuccess)}
        serialCode={sellSuccess?.serialCode ?? ""}
        amount={sellSuccess?.amount ?? 0}
        onClose={() => setSellSuccess(null)}
      />

    </div>
  );
}
