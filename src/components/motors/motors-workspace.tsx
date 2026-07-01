"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { usePathname, useSearchParams } from "next/navigation";
import { parseCollectionFromSearchParams } from "@/lib/navigation/inventory-collections";
import {
  collectionUsesSpecificSheets,
  resolveDefaultGearboxCategory,
} from "@/lib/navigation/specific-categories-for-collection";
import { isPinnedFilterId, motorMatchesPinnedFilter } from "@/lib/navigation/pinned-filters";
import { AnimatePresence, motion } from "framer-motion";
import { LayoutGrid, X } from "lucide-react";

import { sellMotorWithFinancialOperationUseCase } from "@/application/use-cases/sell-motor-with-financial-operation";
import { quickCreateClientUseCase } from "@/application/use-cases/work-orders/quick-create-client";
import { enqueueMotorSoldEffects } from "@/lib/motors/enqueue-motor-sold-effects";
import { unsellMotorWithFinancialOperationUseCase } from "@/application/use-cases/unsell-motor-with-financial-operation";
import { MotorSaleSuccessOverlay } from "@/components/motors/motor-sale-success-overlay";
import { useWorkspace } from "@/components/layout/workspace-context";
import { buildMotorSearchSuggestions } from "@/components/layout/workspace-search-field";
import { useMotorSyncBridge } from "@/components/motors/motor-sync-bridge";
import { MotorsExcelGrid } from "@/components/motors/motors-excel-grid";
import { MotorsGridSkeleton } from "@/components/motors/motors-grid-skeleton";
import { SellMotorDialog, type MotorSellPayload } from "@/components/motors/sell-motor-dialog";
import { useAuth } from "@/components/providers/auth-provider";
import { useBillingGate } from "@/components/billing/billing-gate-provider";
import { Button } from "@/components/ui/button";
import { MotorsImportEmptyLanding } from "@/components/motors/motors-import-empty-landing";
import { SpecificRecordsWorkspace } from "@/components/specific/specific-records-workspace";
import { useMotorImportIslandAction } from "@/components/motors/motor-import-trigger-button";
import { EmptyState } from "@/components/ui/empty-state";
import { MotorEntity } from "@/domain/motor";
import { useClientsRealtime } from "@/hooks/use-clients-realtime";
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
import { createClientRepository } from "@/infrastructure/firestore/client-repository";
import { createFinancialOperationRepository } from "@/infrastructure/firestore/financial-operation-repository";
import { createMotorRepository } from "@/infrastructure/firestore/motor-repository";
import { createSpecificCategoryRepository } from "@/infrastructure/firestore/specific-category-repository";
import { useSpecificCategoriesRealtime } from "@/hooks/use-specific-categories-realtime";

const motorRepository = createMotorRepository();
const clientRepository = createClientRepository();
const financialRepository = createFinancialOperationRepository();
const catalogRepository = createCatalogRepository();
const specificCategoryRepository = createSpecificCategoryRepository();

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
    triggerMotorImport,
    triggerMotorImportPicker,
    triggerSync,
    motorImportProgress,
    motorImportReview,
    cancelMotorImport,
    motorExcelIo,
    selectedSpecificCategoryId,
  } = useWorkspace();
  const openImportIsland = useMotorImportIslandAction();
  const searchParams = useSearchParams();
  const pathname = usePathname();

  const collectionContext = useMemo(
    () => parseCollectionFromSearchParams(searchParams, pathname),
    [pathname, searchParams],
  );
  const pinnedFilter = isPinnedFilterId(collectionContext.filter) ? collectionContext.filter : null;

  const { brands, engines } = useEffectiveCatalog(catalogRepository, motorRepository, uid, companyId, {
    loadMotorsForCatalog: true,
  });

  const specificCategories = useSpecificCategoriesRealtime(
    specificCategoryRepository,
    companyId,
    Boolean(companyId && !soldOnly),
  );

  const selectedSpecificCategory = useMemo(
    () => specificCategories.find((item) => item.id === selectedSpecificCategoryId) ?? null,
    [selectedSpecificCategoryId, specificCategories],
  );

  const transmissionsCategory = useMemo(() => {
    if (collectionContext.collection !== "transmissions") return null;
    return resolveDefaultGearboxCategory(specificCategories);
  }, [collectionContext.collection, specificCategories]);

  const activeSpecificCategory =
    collectionContext.collection === "transmissions"
      ? (selectedSpecificCategory ?? transmissionsCategory)
      : selectedSpecificCategory;

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

  const { clients } = useClientsRealtime(clientRepository, companyId, Boolean(companyId));

  const allMotorsQuery = useMotorsRealtime(motorRepository, {
    uid,
    companyId,
    availability: "all",
    includeDeleted: preferences.importExport.includeDeleted,
  });

  const rowData = useMemo(() => {
    const base = motorsQuery.data ?? [];
    if (!pinnedFilter) return base;
    return base.filter((motor) => motorMatchesPinnedFilter(motor, pinnedFilter));
  }, [motorsQuery.data, pinnedFilter]);
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
    setCounts(motorCount, allMotorsQuery.data?.length ?? motorCount);
  }, [allMotorsQuery.data, motorCount, setCounts]);

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

  async function confirmSellOperation(payload: MotorSellPayload) {
    if (!sellDialog || !uid || !companyId || !profile) return;
    const { motor, mode } = sellDialog;

    if (mode === "sell") {
      const clientName = payload.clientName?.trim() ?? "";
      const clientPhone = payload.clientPhone?.trim() ?? "";
      if (clientName.length < 2 || clientPhone.length < 3) {
        throw new Error("Укажите покупателя и телефон");
      }

      const client =
        clients.find((entry) => entry.id === payload.clientId) ??
        (await quickCreateClientUseCase(clientRepository, {
          companyId,
          fullName: clientName,
          phone: clientPhone,
          createdByUserId: profile.id,
        }));

      const saleComment =
        payload.comment?.trim() ||
        `Продажа · ${motor.serialCode} · ${client.fullName}`;

      await sellMotorWithFinancialOperationUseCase(motorRepository, financialRepository, {
        uid,
        motor,
        companyId,
        createdByUserId: profile.id,
        amount: payload.amount,
        account: payload.account,
        paymentMethod: payload.paymentMethod,
        comment: saleComment,
      });

      void enqueueMotorSoldEffects(motor, {
        amount: payload.amount,
        account: payload.account,
        paymentMethod: payload.paymentMethod,
        comment: saleComment,
        clientId: client.id,
        clientName: client.fullName,
        clientPhone: client.phone,
        warrantyOverride: payload.warrantyOverride,
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

  if (collectionContext.collection === "transmissions") {
    if (activeSpecificCategory) {
      return <SpecificRecordsWorkspace category={activeSpecificCategory} embedded />;
    }

    return (
      <div className="flex h-full flex-col items-center justify-center px-6">
        <EmptyState
          icon={LayoutGrid}
          title="КПП"
          description="Лист КПП появится после первого импорта или настройки компании."
          className="max-w-lg border-none bg-transparent"
        />
      </div>
    );
  }

  if (collectionUsesSpecificSheets(collectionContext.collection)) {
    if (activeSpecificCategory) {
      return <SpecificRecordsWorkspace category={activeSpecificCategory} embedded />;
    }

    return (
      <div className="flex h-full flex-col items-center justify-center px-6">
        <EmptyState
          icon={LayoutGrid}
          title={userCopy.specificSheets.selectSheet}
          description={userCopy.specificSheets.selectSheetHint}
          className="max-w-lg border-none bg-transparent"
        />
      </div>
    );
  }

  if (activeSpecificCategory) {
    return <SpecificRecordsWorkspace category={activeSpecificCategory} embedded />;
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
            className="flex min-h-0 flex-1"
          >
            <MotorsImportEmptyLanding
              canEdit={canEdit}
              progress={motorImportProgress}
              review={motorImportReview}
              onImportFile={async (file) => {
                requirePro("import", async () => {
                  if (!motorExcelIo.canImport) {
                    setDeepActionError("Импорт недоступен на этой странице");
                    return;
                  }
                  try {
                    await triggerMotorImport(file);
                  } catch (error) {
                    setDeepActionError(
                      error instanceof Error ? error.message : "Не удалось начать импорт",
                    );
                  }
                });
              }}
              onPickFile={() =>
                requirePro("import", () => {
                  if (!triggerMotorImportPicker()) {
                    setDeepActionError("Импорт недоступен на этой странице");
                  }
                })
              }
              onManualAdd={revealMotorEditor}
              onOpenReview={openImportIsland}
              onCancelImport={cancelMotorImport}
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
                "flex min-h-0 flex-1 flex-col transition-opacity duration-200 ease-out motion-reduce:transition-none",
                isGridReady ? "opacity-100" : "pointer-events-none opacity-0",
              )}
            >
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
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <SellMotorDialog
        companyId={companyId}
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
