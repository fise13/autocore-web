"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";

import { adjustStockUseCase } from "@/application/use-cases/warehouse/adjust-stock";
import { applyImportJobUseCase, createImportJobUseCase } from "@/application/use-cases/warehouse/apply-import-job";
import { ensureDefaultWarehouseUseCase } from "@/application/use-cases/warehouse/ensure-default-warehouse";
import { issueStockSaleUseCase } from "@/application/use-cases/warehouse/issue-stock-sale";
import { lookupBarcodeUseCase } from "@/application/use-cases/warehouse/lookup-barcode";
import { receiveStockUseCase } from "@/application/use-cases/warehouse/receive-stock";
import { transferStockUseCase } from "@/application/use-cases/warehouse/transfer-stock";
import { useWorkspace } from "@/components/layout/workspace-context";
import { buildWarehouseSearchSuggestions } from "@/components/layout/workspace-search-field";
import { MotorsGridSkeleton } from "@/components/motors/motors-grid-skeleton";
import { WarehouseAdjustmentDialog } from "@/components/warehouse/warehouse-adjustment-dialog";
import { WarehouseBarcodePanel } from "@/components/warehouse/warehouse-barcode-panel";
import { WarehouseExcelGrid } from "@/components/warehouse/warehouse-excel-grid";
import { WarehouseImportWizard } from "@/components/warehouse/import/warehouse-import-wizard";
import { WarehouseImportHistoryPanel } from "@/components/warehouse/import/warehouse-import-history-panel";
import { InventoryImportJob } from "@/domain/inventory-import";
import { WarehouseMovementDrawer } from "@/components/warehouse/warehouse-movement-drawer";
import { WarehouseReceiptDialog } from "@/components/warehouse/warehouse-receipt-dialog";
import { WarehouseSaleDialog } from "@/components/warehouse/warehouse-sale-dialog";
import { WarehouseTransferDialog } from "@/components/warehouse/warehouse-transfer-dialog";
import { useAuth } from "@/components/providers/auth-provider";
import { InventoryItem } from "@/domain/inventory";
import { useInventoryMovementsRealtime } from "@/hooks/use-inventory-movements-realtime";
import { useInventoryRealtime } from "@/hooks/use-inventory-realtime";
import { useStockLevelsRealtime } from "@/hooks/use-stock-levels-realtime";
import { useWarehousesRealtime } from "@/hooks/use-warehouses-realtime";
import { can } from "@/lib/auth/permissions";
import { normalizeCompanyId } from "@/lib/company-id";
import { filterWarehouseItems } from "@/lib/warehouse/warehouse-grid-data-store";
import { projectItemsForWarehouse } from "@/lib/warehouse/warehouse-stock-projection";
import { cn } from "@/lib/utils";
import { createBarcodeMappingRepository } from "@/infrastructure/firestore/barcode-mapping-repository";
import { createFinancialOperationRepository } from "@/infrastructure/firestore/financial-operation-repository";
import { createInventoryDocumentRepository } from "@/infrastructure/firestore/inventory-document-repository";
import { createInventoryImportRepository } from "@/infrastructure/firestore/inventory-import-repository";
import { createInventoryItemRepository } from "@/infrastructure/firestore/inventory-item-repository";
import { createInventoryMovementRepository } from "@/infrastructure/firestore/inventory-movement-repository";
import { createInventoryStockLevelRepository } from "@/infrastructure/firestore/inventory-stock-level-repository";
import { createWarehousePresenceRepository } from "@/infrastructure/firestore/warehouse-presence-repository";
import { createWarehouseRepository } from "@/infrastructure/firestore/warehouse-repository";

const itemRepository = createInventoryItemRepository();
const stockLevelRepository = createInventoryStockLevelRepository();
const movementRepository = createInventoryMovementRepository();
const warehouseRepository = createWarehouseRepository();
const financialRepository = createFinancialOperationRepository();
const documentRepository = createInventoryDocumentRepository();
const barcodeRepository = createBarcodeMappingRepository();
const importRepository = createInventoryImportRepository();
const presenceRepository = createWarehousePresenceRepository();

type DialogKind = "receipt" | "adjust" | "sale" | "transfer" | "history" | "barcode" | "import" | "import-history";

export function WarehouseWorkspace() {
  const { profile } = useAuth();
  const workspace = useWorkspace();
  const {
    registerWarehouseExcelHandlers,
    setWarehouseExcelAvailability,
    registerWarehouseImportPicker,
    registerWarehouseBarcodeHandler,
    saveError,
    setSaveError,
    search,
    setSearch,
    setWarehouseItemHighlightId,
    setWarehouseBarcodePrefill,
    lastBarcodeScan,
    setCounts,
    setSearchSuggestions,
    selectedWarehouseId,
  } = workspace;
  const searchParams = useSearchParams();
  const companyId = normalizeCompanyId(profile?.companyId);
  const actorUserId = profile?.id ?? "";
  const canView = can(profile, "inventory_view");
  const canEdit = can(profile, "inventory_edit");
  const canImport = can(profile, "inventory_import");
  const canExport = can(profile, "inventory_export");

  const itemsQuery = useInventoryRealtime(itemRepository, companyId, canView);
  const stockLevelsQuery = useStockLevelsRealtime(stockLevelRepository, companyId, canView);
  const { warehouses, defaultWarehouse } = useWarehousesRealtime(warehouseRepository, companyId, canView);

  const activeWarehouseId =
    selectedWarehouseId && warehouses.some((warehouse) => warehouse.id === selectedWarehouseId)
      ? selectedWarehouseId
      : defaultWarehouse?.id ?? warehouses[0]?.id;

  const activeWarehouse = warehouses.find((warehouse) => warehouse.id === activeWarehouseId) ?? null;
  const [activeItem, setActiveItem] = useState<InventoryItem | null>(null);
  const [dialog, setDialog] = useState<DialogKind | null>(null);
  const [importResumeSession, setImportResumeSession] = useState<{
    jobId: string;
    rows: InventoryImportJob["rows"];
    columnMapping: Record<string, string>;
    sourceFileName?: string;
    stats: InventoryImportJob["stats"];
  } | null>(null);
  const [ioBusy, setIoBusy] = useState<"export" | "import" | null>(null);
  const { movements, loading: movementsLoading } = useInventoryMovementsRealtime(
    movementRepository,
    companyId,
    activeItem?.id,
    dialog === "history" && Boolean(activeItem),
  );

  useEffect(() => {
    if (!companyId || !canEdit) return;
    void ensureDefaultWarehouseUseCase(warehouseRepository, companyId, actorUserId).catch(() => undefined);
  }, [actorUserId, canEdit, companyId]);

  useEffect(() => {
    if (!companyId || !actorUserId || !canView) return;
    const heartbeat = () => {
      void presenceRepository.heartbeat({
        companyId,
        userId: actorUserId,
        displayName: profile?.displayName ?? profile?.email,
        action: dialog === "barcode" ? "scanning" : dialog === "import" ? "importing" : "viewing",
      });
    };
    heartbeat();
    const timer = window.setInterval(heartbeat, 30_000);
    return () => {
      window.clearInterval(timer);
      void presenceRepository.leave(companyId, actorUserId);
    };
  }, [actorUserId, canView, companyId, dialog, profile?.displayName, profile?.email]);

  const items = itemsQuery.data ?? [];
  const stockLevels = stockLevelsQuery.stockLevels;
  const warehouseItems = useMemo(
    () =>
      activeWarehouseId
        ? projectItemsForWarehouse(items, stockLevels, activeWarehouseId, warehouses)
        : [],
    [activeWarehouseId, items, stockLevels, warehouses],
  );
  const filteredItems = useMemo(
    () => filterWarehouseItems(warehouseItems, search),
    [warehouseItems, search],
  );
  const isGridReady = !itemsQuery.isBootstrapping;
  const warehouseSearchSuggestions = useMemo(
    () => buildWarehouseSearchSuggestions(warehouseItems),
    [warehouseItems],
  );

  useEffect(() => {
    setCounts(filteredItems.length, warehouseItems.length);
  }, [filteredItems.length, warehouseItems.length, setCounts]);

  useEffect(() => {
    if (!canView) {
      setSearchSuggestions([]);
      return;
    }
    setSearchSuggestions(warehouseSearchSuggestions);
  }, [canView, setSearchSuggestions, warehouseSearchSuggestions]);

  useEffect(() => () => setSearchSuggestions([]), [setSearchSuggestions]);

  useEffect(() => {
    const query = searchParams.get("search")?.trim();
    const highlight = searchParams.get("highlight")?.trim();
    const barcode = searchParams.get("barcode")?.trim();
    if (query) setSearch(query);
    if (highlight) setWarehouseItemHighlightId(highlight);
    if (barcode) setWarehouseBarcodePrefill(barcode);
  }, [searchParams, setSearch, setWarehouseBarcodePrefill, setWarehouseItemHighlightId]);

  const exportWarehouse = useCallback(async () => {
    setIoBusy("export");
    try {
      const header = [
        "Артикул",
        "Название",
        "Категория",
        "Бренд",
        "На складе",
        "Резерв",
        "Доступно",
        "Закупка",
        "Продажа",
        "Поставщик",
        "Штрихкод",
        "Место",
        "Мин. запас",
      ];
      const lines = filteredItems.map((item) =>
        [
          item.sku,
          item.name,
          item.categoryPath?.join(" / ") ?? "",
          item.brandName ?? "",
          item.totalOnHand,
          item.totalReserved,
          item.totalAvailable,
          item.purchasePrice ?? "",
          item.sellPrice ?? "",
          item.supplierName ?? "",
          item.barcodes[0] ?? "",
          item.warehouseLocation ?? "",
          item.lowStockThreshold ?? "",
        ].join(","),
      );
      const blob = new Blob([[header.join(","), ...lines].join("\n")], { type: "text/csv;charset=utf-8" });
      const url = URL.createObjectURL(blob);
      const anchor = document.createElement("a");
      anchor.href = url;
      anchor.download = "warehouse-export.csv";
      anchor.click();
      URL.revokeObjectURL(url);
    } finally {
      setIoBusy(null);
    }
  }, [filteredItems]);

  const importWarehouse = useCallback(async () => {
    setIoBusy("import");
    try {
      setDialog("import");
    } finally {
      setIoBusy(null);
    }
  }, []);

  useEffect(() => {
    registerWarehouseExcelHandlers({ exportWarehouse, importWarehouse });
    return () => registerWarehouseExcelHandlers(null);
  }, [exportWarehouse, importWarehouse, registerWarehouseExcelHandlers]);

  useEffect(() => {
    registerWarehouseImportPicker(() => {
      setDialog("import");
    });
    return () => registerWarehouseImportPicker(null);
  }, [registerWarehouseImportPicker]);

  useEffect(() => {
    registerWarehouseBarcodeHandler(() => {
      setDialog("barcode");
    });
    return () => registerWarehouseBarcodeHandler(null);
  }, [registerWarehouseBarcodeHandler]);

  useEffect(() => {
    setWarehouseExcelAvailability({
      canExport: canExport && filteredItems.length > 0,
      canImport: canImport && canEdit,
      busy: ioBusy,
    });
    return () => {
      setWarehouseExcelAvailability({ canExport: false, canImport: false, busy: null });
    };
  }, [canEdit, canExport, canImport, filteredItems.length, ioBusy, setWarehouseExcelAvailability]);

  function openDialog(kind: DialogKind, item?: InventoryItem) {
    if (item) setActiveItem(item);
    setDialog(kind);
  }

  if (itemsQuery.isError) {
    return (
      <div className="flex h-full flex-col items-center justify-center gap-2 p-6 text-center text-sm">
        <p className="text-destructive">{itemsQuery.errorMessage ?? "Не удалось загрузить склад"}</p>
      </div>
    );
  }

  if (!canView) {
    return (
      <div className="flex flex-1 items-center justify-center text-sm text-muted-foreground">
        Нет доступа к складу
      </div>
    );
  }

  const readOnly = !canEdit;

  return (
    <div className="relative flex h-full min-h-0 flex-1 flex-col">
      {readOnly ? (
        <div className="border-b border-amber-500/25 bg-amber-500/10 px-4 py-2 text-center text-xs text-amber-800 dark:text-amber-200">
          Режим просмотра — для редактирования нужна роль с правом «Редактирование инвентаря»
        </div>
      ) : null}
      {saveError ? (
        <div className="flex items-center justify-between gap-3 border-b border-destructive/25 bg-destructive/8 px-4 py-2.5 text-xs text-destructive">
          <span className="min-w-0 flex-1 leading-relaxed">{saveError}</span>
          <button
            type="button"
            className="shrink-0 rounded-md border border-destructive/20 px-2.5 py-1 text-[11px] font-medium transition-colors hover:bg-destructive/10"
            onClick={() => setSaveError(null)}
          >
            Скрыть
          </button>
        </div>
      ) : null}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b bg-muted/20 px-4 py-2 text-xs text-muted-foreground">
        <span>
          Склад:{" "}
          <span className="font-medium text-foreground">
            {activeWarehouse?.name ?? "выберите в меню слева"}
          </span>
          {warehouses.length > 1 ? (
            <span className="text-muted-foreground"> · остатки только этого склада</span>
          ) : null}
        </span>
        <div className="flex flex-wrap items-center gap-2">
          {lastBarcodeScan ? (
            <span className="rounded-full border bg-background px-2.5 py-1 text-[11px] text-foreground">
              {lastBarcodeScan.itemName
                ? `Скан: ${lastBarcodeScan.itemName}`
                : `Скан: ${lastBarcodeScan.barcode}`}
            </span>
          ) : (
            <span className="text-[11px]">Сканер USB активен — наведите и отсканируйте</span>
          )}
          {canEdit && !defaultWarehouse ? (
            <button
              type="button"
              className="rounded-md border px-2 py-1 text-foreground transition-colors hover:bg-muted"
              onClick={() => {
                void ensureDefaultWarehouseUseCase(warehouseRepository, companyId, actorUserId);
              }}
            >
              Создать основной склад
            </button>
          ) : null}
        </div>
      </div>
      {itemsQuery.isBootstrapping ? <MotorsGridSkeleton /> : null}
      <div
        className={cn(
          "flex min-h-0 flex-1 flex-col transition-[opacity,transform] duration-500 ease-out motion-reduce:transition-none",
          isGridReady ? "opacity-100 translate-y-0" : "pointer-events-none absolute inset-0 opacity-0 translate-y-1",
        )}
      >
        {isGridReady && activeWarehouseId ? (
          <WarehouseExcelGrid
            key={activeWarehouseId}
            items={filteredItems}
            companyId={companyId}
            canEdit={canEdit}
            repository={itemRepository}
            stockLevelRepository={stockLevelRepository}
            movementRepository={movementRepository}
            warehouseRepository={warehouseRepository}
            financialRepository={financialRepository}
            activeWarehouseId={activeWarehouseId}
            actorUserId={actorUserId}
            onReceipt={(item) => openDialog("receipt", item)}
            onAdjust={(item) => openDialog("adjust", item)}
            onSale={(item) => openDialog("sale", item)}
            onTransfer={(item) => openDialog("transfer", item)}
            onHistory={(item) => openDialog("history", item)}
          />
        ) : isGridReady ? (
          <div className="flex flex-1 items-center justify-center p-6 text-center text-sm text-muted-foreground">
            Выберите или создайте склад в меню слева
          </div>
        ) : null}
      </div>

      <WarehouseReceiptDialog
        item={activeItem}
        open={dialog === "receipt"}
        onOpenChange={(open) => !open && setDialog(null)}
        onConfirm={async (payload) => {
          if (!activeItem) return;
          await receiveStockUseCase(
            itemRepository,
            stockLevelRepository,
            movementRepository,
            warehouseRepository,
            financialRepository,
            {
              companyId,
              itemId: activeItem.id,
              warehouseId: activeWarehouseId,
              quantity: payload.quantity,
              unitCost: payload.unitCost,
              reason: payload.reason,
              createExpense: payload.createExpense,
              actorUserId,
            },
          );
        }}
      />

      <WarehouseAdjustmentDialog
        item={activeItem}
        open={dialog === "adjust"}
        onOpenChange={(open) => !open && setDialog(null)}
        onConfirm={async (payload) => {
          if (!activeItem) return;
          await adjustStockUseCase(
            itemRepository,
            stockLevelRepository,
            movementRepository,
            warehouseRepository,
            {
              companyId,
              itemId: activeItem.id,
              warehouseId: activeWarehouseId,
              quantity: payload.quantity,
              direction: payload.direction,
              reason: payload.reason,
              actorUserId,
            },
          );
        }}
      />

      <WarehouseSaleDialog
        item={activeItem}
        open={dialog === "sale"}
        onOpenChange={(open) => !open && setDialog(null)}
        onConfirm={async (payload) => {
          if (!activeItem) return;
          await issueStockSaleUseCase(
            itemRepository,
            stockLevelRepository,
            movementRepository,
            warehouseRepository,
            financialRepository,
            {
              companyId,
              itemId: activeItem.id,
              warehouseId: activeWarehouseId,
              quantity: payload.quantity,
              amount: payload.amount,
              account: payload.account,
              paymentMethod: payload.paymentMethod,
              comment: payload.comment,
              actorUserId,
            },
          );
        }}
      />

      <WarehouseTransferDialog
        item={activeItem}
        warehouses={warehouses}
        open={dialog === "transfer"}
        onOpenChange={(open) => !open && setDialog(null)}
        onConfirm={async (payload) => {
          if (!activeItem) return;
          await transferStockUseCase(
            itemRepository,
            stockLevelRepository,
            movementRepository,
            documentRepository,
            {
              companyId,
              itemId: activeItem.id,
              fromWarehouseId: payload.fromWarehouseId,
              toWarehouseId: payload.toWarehouseId,
              quantity: payload.quantity,
              reason: payload.reason,
              actorUserId,
            },
          );
        }}
      />

      <WarehouseMovementDrawer
        item={activeItem}
        movements={movements}
        loading={movementsLoading}
        open={dialog === "history"}
        onOpenChange={(open) => !open && setDialog(null)}
      />

      <WarehouseBarcodePanel
        open={dialog === "barcode"}
        onOpenChange={(open) => !open && setDialog(null)}
        onLookup={async (barcode) => {
          const result = await lookupBarcodeUseCase(barcodeRepository, itemRepository, companyId, barcode);
          return result.item;
        }}
        onFound={(item) => {
          setActiveItem(item);
          setSearch(item.sku);
          setWarehouseItemHighlightId(item.id);
        }}
      />

      <WarehouseImportWizard
        open={dialog === "import"}
        onOpenChange={(open) => {
          if (!open) {
            setImportResumeSession(null);
            setDialog(null);
          }
        }}
        useAi
        resumeSession={importResumeSession}
        onOpenHistory={() => setDialog("import-history")}
        onAnalyze={async (input) =>
          createImportJobUseCase(importRepository, itemRepository, {
            companyId,
            file: input.file,
            selectedSheetName: input.selectedSheetName,
            manualColumnMapping: input.manualColumnMapping,
            useAi: true,
            existingItems: items,
            createdByUserId: actorUserId,
            onProgress: input.onProgress,
            sourceFileName: input.file.name,
          })
        }
        onApply={async (input) =>
          applyImportJobUseCase(
            importRepository,
            itemRepository,
            stockLevelRepository,
            movementRepository,
            warehouseRepository,
            financialRepository,
            {
              companyId,
              jobId: input.jobId,
              rows: input.rows,
              actorUserId,
              defaultWarehouseId: activeWarehouseId,
              sourceFileName: input.sourceFileName,
              applyOptions: input.applyOptions,
              onProgress: input.onProgress,
              shouldCancel: input.shouldCancel,
            },
          )
        }
      />

      <WarehouseImportHistoryPanel
        open={dialog === "import-history"}
        onOpenChange={(open) => setDialog(open ? "import-history" : "import")}
        companyId={companyId}
        actorUserId={actorUserId}
        importRepository={importRepository}
        itemRepository={itemRepository}
        stockLevelRepository={stockLevelRepository}
        movementRepository={movementRepository}
        financialRepository={financialRepository}
        onResume={(job, rows) => {
          setImportResumeSession({
            jobId: job.id,
            rows,
            columnMapping: job.columnMapping,
            sourceFileName: job.sourceFileName,
            stats: job.stats,
          });
          setDialog("import");
        }}
      />
    </div>
  );
}
