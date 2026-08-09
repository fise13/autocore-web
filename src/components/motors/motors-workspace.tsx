"use client";

import { useCallback, useEffect, useMemo, useState, type ReactNode } from "react";
import { usePathname, useSearchParams } from "next/navigation";
import { parseCollectionFromSearchParams } from "@/lib/navigation/inventory-collections";
import {
  collectionUsesSpecificSheets,
  resolveDefaultGearboxCategory,
} from "@/lib/navigation/specific-categories-for-collection";
import { isPinnedFilterId, motorMatchesPinnedFilter } from "@/lib/navigation/pinned-filters";
import { AnimatePresence, motion } from "motion/react";
import { LayoutGrid, X } from "lucide-react";

import { sellMotorWithFinancialOperationUseCase } from "@/application/use-cases/sell-motor-with-financial-operation";
import { pruneUnusedMotorCatalogUseCase } from "@/application/use-cases/motors/prune-unused-motor-catalog";
import { quickCreateClientUseCase } from "@/application/use-cases/work-orders/quick-create-client";
import { enqueueMotorSoldEffects } from "@/lib/motors/enqueue-motor-sold-effects";
import { emitKnowledgeEvent } from "@/lib/knowledge/knowledge-api.client";
import { writeMotorWarrantySeed, writeOperationWarrantySeed } from "@/lib/motors/motor-warranty-session";
import { unsellMotorWithFinancialOperationUseCase } from "@/application/use-cases/unsell-motor-with-financial-operation";
import { MotorSaleSuccessOverlay } from "@/components/motors/motor-sale-success-overlay";
import {
  PanelActiveProvider,
  usePanelActive,
} from "@/components/layout/panel-active-context";
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
import {
  createSpecificCategoryRepository,
  type SpecificCategoryEntity,
} from "@/infrastructure/firestore/specific-category-repository";
import { useSpecificCategoriesRealtime } from "@/hooks/use-specific-categories-realtime";

type MotorsCollectionPanel =
  | { key: "motors"; kind: "motors" }
  | { key: string; kind: "specific"; category: SpecificCategoryEntity }
  | { key: string; kind: "empty"; title: string; description: string };

function CollectionCachePanel({
  cacheKey,
  isActive,
  children,
}: {
  cacheKey: string;
  isActive: boolean;
  children: ReactNode;
}) {
  return (
    <div
      className={cn("min-h-0", isActive ? "flex flex-1 flex-col" : "hidden")}
      aria-hidden={!isActive}
      data-collection-cache={cacheKey}
      data-panel-active={isActive ? "true" : "false"}
    >
      <PanelActiveProvider active={isActive}>{children}</PanelActiveProvider>
    </div>
  );
}

const motorRepository = createMotorRepository();
const clientRepository = createClientRepository();
const financialRepository = createFinancialOperationRepository();
const catalogRepository = createCatalogRepository();
const specificCategoryRepository = createSpecificCategoryRepository();

export function MotorsWorkspace({ soldOnly = false }: { soldOnly?: boolean }) {
  const { profile } = useAuth();
  const { requirePro } = useBillingGate();
  const workspace = useWorkspace();
  const routePanelActive = usePanelActive();
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

  const { brands, engines, firestoreBrands, firestoreEngines } = useEffectiveCatalog(
    catalogRepository,
    motorRepository,
    uid,
    companyId,
    {
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
      ? (transmissionsCategory ?? selectedSpecificCategory)
      : selectedSpecificCategory;

  const activeCollectionPanel = useMemo((): MotorsCollectionPanel => {
    if (collectionContext.collection === "transmissions") {
      if (activeSpecificCategory) {
        return {
          key: `specific:${activeSpecificCategory.id}`,
          kind: "specific",
          category: activeSpecificCategory,
        };
      }
      return {
        key: "empty:transmissions",
        kind: "empty",
        title: userCopy.motors.transmissionSheetTitle,
        description: userCopy.motors.transmissionSheetDescription,
      };
    }

    if (collectionUsesSpecificSheets(collectionContext.collection)) {
      if (activeSpecificCategory) {
        return {
          key: `specific:${activeSpecificCategory.id}`,
          kind: "specific",
          category: activeSpecificCategory,
        };
      }
      return {
        key: `empty:${collectionContext.collection}`,
        kind: "empty",
        title: userCopy.specificSheets.selectSheet,
        description: userCopy.specificSheets.selectSheetHint,
      };
    }

    if (activeSpecificCategory) {
      return {
        key: `specific:${activeSpecificCategory.id}`,
        kind: "specific",
        category: activeSpecificCategory,
      };
    }

    return { key: "motors", kind: "motors" };
  }, [activeSpecificCategory, collectionContext.collection]);

  const [visitedCollectionPanels, setVisitedCollectionPanels] = useState<MotorsCollectionPanel[]>(() => [
    activeCollectionPanel,
  ]);

  useEffect(() => {
    setVisitedCollectionPanels((current) => {
      const existingIndex = current.findIndex((panel) => panel.key === activeCollectionPanel.key);
      if (existingIndex === -1) return [...current, activeCollectionPanel];
      const existing = current[existingIndex];
      if (
        existing.kind === "specific" &&
        activeCollectionPanel.kind === "specific" &&
        existing.category !== activeCollectionPanel.category
      ) {
        const next = [...current];
        next[existingIndex] = activeCollectionPanel;
        return next;
      }
      return current;
    });
  }, [activeCollectionPanel]);

  const motorsSheetActive = routePanelActive && activeCollectionPanel.kind === "motors";

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

  // Drop orphan catalog brands (typed then cleared) so sidebar matches Excel.
  useEffect(() => {
    if (!canEdit || !companyId) return;
    if (allMotorsQuery.isBootstrapping) return;
    if (firestoreBrands.length === 0 && firestoreEngines.length === 0) return;
    const motors = allMotorsQuery.data ?? [];
    const hasMotorBrands = motors.some((motor) => (motor.brandName ?? "").trim().length > 0);
    if (!hasMotorBrands) return;
    void pruneUnusedMotorCatalogUseCase(catalogRepository, {
      motors,
      brands: firestoreBrands,
      engines: firestoreEngines,
    }).catch(() => {
      // Best-effort; Excel save also prunes.
    });
  }, [
    allMotorsQuery.data,
    allMotorsQuery.isBootstrapping,
    canEdit,
    companyId,
    firestoreBrands,
    firestoreEngines,
  ]);

  const rowData = useMemo(() => {
    const base = motorsQuery.data ?? [];
    if (!pinnedFilter) return base;
    return base.filter((motor) => motorMatchesPinnedFilter(motor, pinnedFilter));
  }, [motorsQuery.data, pinnedFilter]);
  const isGridReady = !motorsQuery.isBootstrapping;
  const { setCounts, setSearchSuggestions, setAllowDocumentImportIslandOnDenseChrome } = workspace;
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
    enabled: isGridReady && motorsSheetActive,
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
    if (!motorsSheetActive) return;
    setCounts(motorCount, allMotorsQuery.data?.length ?? motorCount);
  }, [allMotorsQuery.data, motorCount, motorsSheetActive, setCounts]);

  useEffect(() => {
    if (!motorsSheetActive) return;
    const openSpace = showMotorsEmpty || (soldOnly && isGridReady && motorCount === 0);
    setAllowDocumentImportIslandOnDenseChrome(openSpace);
    return () => setAllowDocumentImportIslandOnDenseChrome(false);
  }, [
    isGridReady,
    motorCount,
    motorsSheetActive,
    setAllowDocumentImportIslandOnDenseChrome,
    showMotorsEmpty,
    soldOnly,
  ]);

  useEffect(() => {
    if (!motorsSheetActive) return;
    if (!can(profile, "inventory_view")) {
      setSearchSuggestions([]);
      return;
    }
    setSearchSuggestions(motorSearchSuggestions);
    return () => setSearchSuggestions([]);
  }, [motorSearchSuggestions, motorsSheetActive, profile, setSearchSuggestions]);

  const handleDeepAction = useCallback(
    async (action: DeepAction) => {
      setDeepActionError(null);

      switch (action) {
        case "import": {
          requirePro("import", () => {
            if (!triggerMotorImportPicker()) {
              setDeepActionError(userCopy.motors.importUnavailable);
            }
          });
          break;
        }
        case "export": {
          requirePro("export", async () => {
            try {
              await triggerMotorExport();
            } catch (error) {
              setDeepActionError(error instanceof Error ? error.message : userCopy.motors.exportFailed);
            }
          });
          break;
        }
        case "sync": {
          requirePro("sync", async () => {
            const synced = await triggerSync();
            if (!synced) {
              setDeepActionError(userCopy.motors.waitForGrid);
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
        throw new Error(userCopy.motors.buyerRequired);
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
        userCopy.motors.saleCommentPrefix(motor.serialCode, client.fullName);

      const effects = await enqueueMotorSoldEffects(motor, {
        amount: payload.amount,
        account: payload.account,
        paymentMethod: payload.paymentMethod,
        comment: saleComment,
        clientId: client.id,
        clientName: client.fullName,
        clientPhone: client.phone,
        warrantyOverride: payload.warrantyOverride,
      });

      if (effects.warrantyId) {
        writeMotorWarrantySeed(motor.id, effects.warrantyId);
      }

      const operationId = await sellMotorWithFinancialOperationUseCase(
        motorRepository,
        financialRepository,
        {
          uid,
          motor,
          companyId,
          createdByUserId: profile.id,
          amount: payload.amount,
          account: payload.account,
          paymentMethod: payload.paymentMethod,
          cashReceived: payload.cashReceived ?? null,
          comment: saleComment,
          relatedWarrantyId: effects.warrantyId ?? null,
          relatedClientId: client.id,
        },
      );

      if (operationId && effects.warrantyId) {
        writeOperationWarrantySeed(operationId, effects.warrantyId);
      }

      if (!effects.ok && effects.error) {
        console.warn("[motor-sell] sold-effects:", effects.error);
      }

      if (motor.engineCode || motor.brandName) {
        void emitKnowledgeEvent({
          type: "motor.sold",
          engineCode: motor.engineCode,
          brandName: motor.brandName,
          clientId: client.id,
          payload: {
            engineCode: motor.engineCode,
            brandName: motor.brandName,
            sku: motor.serialCode,
            price: payload.amount,
          },
        });
      }

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
          comment: userCopy.motors.saleComment,
        });
        const effects = await enqueueMotorSoldEffects(motor, {
          amount: 0,
          account: "cashbox",
          paymentMethod: "cash",
          comment: userCopy.motors.saleComment,
        });
        if (effects.warrantyId) {
          writeMotorWarrantySeed(motor.id, effects.warrantyId);
        }
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
          comment: userCopy.motors.returnComment,
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

  const showSoldEmpty =
    soldOnly &&
    activeCollectionPanel.kind === "motors" &&
    isGridReady &&
    rowData.length === 0;

  return (
    <div className="relative flex h-full min-h-0 flex-1 flex-col">
      {deepActionError && motorsSheetActive ? (
        <div className="mx-3 mt-3 shrink-0 rounded-md border border-destructive/40 bg-destructive/10 px-3 py-2 text-xs text-destructive">
          {deepActionError}
        </div>
      ) : null}

      {visitedCollectionPanels.map((panel) => {
        const isActive = routePanelActive && panel.key === activeCollectionPanel.key;
        if (panel.kind === "specific") {
          return (
            <CollectionCachePanel key={panel.key} cacheKey={panel.key} isActive={isActive}>
              <SpecificRecordsWorkspace category={panel.category} embedded />
            </CollectionCachePanel>
          );
        }
        if (panel.kind === "empty") {
          return (
            <CollectionCachePanel key={panel.key} cacheKey={panel.key} isActive={isActive}>
              <div className="flex h-full flex-col items-center justify-center px-6">
                <EmptyState
                  icon={LayoutGrid}
                  title={panel.title}
                  description={panel.description}
                  className="max-w-lg border-none bg-transparent"
                />
              </div>
            </CollectionCachePanel>
          );
        }

        return (
          <CollectionCachePanel key={panel.key} cacheKey={panel.key} isActive={isActive}>
            {showSoldEmpty ? (
              <div className="flex h-full flex-col items-center justify-center px-6">
                <EmptyState
                  icon={LayoutGrid}
                  title={userCopy.motors.soldEmptyTitle}
                  description={userCopy.motors.soldEmptyDescription}
                  className="max-w-lg border-none bg-transparent"
                />
              </div>
            ) : (
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
                            setDeepActionError(userCopy.motors.importUnavailable);
                            return;
                          }
                          try {
                            await triggerMotorImport(file);
                          } catch (error) {
                            setDeepActionError(
                              error instanceof Error ? error.message : userCopy.motors.importHost.startFailed,
                            );
                          }
                        });
                      }}
                      onPickFile={() =>
                        requirePro("import", () => {
                          if (!triggerMotorImportPicker()) {
                            setDeepActionError(userCopy.motors.importUnavailable);
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
                          {userCopy.motors.saleHint}
                        </p>
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon-sm"
                          onClick={() => setSellHintVisible(false)}
                          aria-label={userCopy.motors.closeHintAria}
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
                        catalogMotors={allMotorsQuery.data ?? []}
                        catalogBrands={firestoreBrands}
                        catalogEngines={firestoreEngines}
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
                        isActive={isActive}
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
            )}
          </CollectionCachePanel>
        );
      })}

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
