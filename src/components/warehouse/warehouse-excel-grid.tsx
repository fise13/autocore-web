"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import { useGridEnterMotion } from "@/hooks/use-grid-enter-motion";
import { syncWarehouseGridRowUseCase } from "@/application/use-cases/warehouse/sync-warehouse-grid-row";
import { GridEditorOverlay } from "@/components/grid/grid-editor-overlay";
import { GridFillHandle } from "@/components/grid/grid-fill-handle";
import { useWorkspace } from "@/components/layout/workspace-context";
import { GridZoomControl } from "@/components/motors/grid-zoom-control";
import { InventoryItem } from "@/domain/inventory";
import {
  boundingDataRange,
  findLastUsedCell,
  jumpColumnInRow,
  jumpRowInColumn,
} from "@/lib/grid/grid-data-region-navigation";
import { buildFillOperations } from "@/lib/grid/grid-fill-engine";
import { GridMutation, GridCommandBus } from "@/lib/grid/grid-command-bus";
import { isRedoShortcut, isUndoShortcut } from "@/lib/grid/grid-keyboard-shortcuts";
import { resolvePointerCell } from "@/lib/grid/pointer-to-cell";
import { useGridScrollIntoView } from "@/lib/grid/scroll-into-view";
import { handleGridRedo, handleGridUndo } from "@/lib/grid/grid-undo-redo";
import {
  allRanges,
  clickSelection,
  dragSelection,
  GridSelectionState,
  initialSelection,
  primaryRange,
  selectWholeColumn,
  selectWholeColumnActiveTop,
  selectWholeRow,
  selectWholeRowActiveStart,
} from "@/lib/grid/selection-controller";
import { GridCellAddress, GridRange, isCellInsideRange, normalizeRange } from "@/lib/grid/grid-types";
import { resolveGridColumnAutocomplete } from "@/lib/grid/grid-column-autocomplete";
import { gridPalette } from "@/lib/grid/grid-palette";
import {
  applyWarehouseDraftField,
  buildSavedRowFromCreate,
  buildWarehouseGridRows,
  createEmptyWarehouseRow,
  growWarehouseRows,
  hasWarehouseDraftContent,
  reconcileWarehouseRowsWithRemote,
  formatWarehouseUpdatedAt,
  isWarehouseRowLowStock,
  isWarehouseRowOutOfStock,
  savedRowMetadataChanged,
  savedRowShouldArchive,
  savedRowStockChanged,
  warehouseRowHasRequiredFields,
  warehouseRowMatchesItem,
  WAREHOUSE_ROW_ARCHIVED,
  WarehouseGridRow,
} from "@/lib/warehouse/warehouse-grid-data-store";
import {
  buildWarehouseGridLayoutMetrics,
  isWarehouseEditableColumn,
  isWarehouseReadOnlyColumn,
  resolveWarehouseClearColumn,
  WAREHOUSE_ACTION_COLUMN,
  WAREHOUSE_EDITABLE_COL_END,
  WAREHOUSE_EDITABLE_COL_START,
  WAREHOUSE_GRID_EMPTY_ROWS_EXPAND,
  WAREHOUSE_GRID_EMPTY_ROWS_THRESHOLD,
  WAREHOUSE_READ_ONLY_COLUMNS,
  warehouseCellFrame,
} from "@/lib/warehouse/warehouse-grid-layout-engine";
import {
  categoryLabelFromPath,
  categoryPathFromLabel,
  normalizeBarcode,
} from "@/lib/warehouse/warehouse-search";
import { InventoryItemRepository } from "@/infrastructure/firestore/inventory-item-repository";
import { InventoryMovementRepository } from "@/infrastructure/firestore/inventory-movement-repository";
import { InventoryStockLevelRepository } from "@/infrastructure/firestore/inventory-stock-level-repository";
import { FinancialOperationRepository } from "@/infrastructure/firestore/financial-operation-repository";
import { WarehouseRepository } from "@/infrastructure/firestore/warehouse-repository";
import { mapAuthError, mapGridSaveError } from "@/lib/user-copy";
import { cn } from "@/lib/utils";

type WarehouseExcelGridProps = {
  items: InventoryItem[];
  companyId: string;
  canEdit: boolean;
  repository: InventoryItemRepository;
  stockLevelRepository: InventoryStockLevelRepository;
  movementRepository: InventoryMovementRepository;
  warehouseRepository: WarehouseRepository;
  financialRepository: FinancialOperationRepository;
  activeWarehouseId?: string;
  actorUserId: string;
  onReceipt: (item: InventoryItem) => void;
  onAdjust: (item: InventoryItem) => void;
  onSale: (item: InventoryItem) => void;
  onTransfer: (item: InventoryItem) => void;
  onHistory: (item: InventoryItem) => void;
  onCloudPendingChange?: (pending: boolean) => void;
};

type EditorState = {
  cell: GridCellAddress;
  value: string;
  initialValue: string;
  selectAll: boolean;
};

type ContextMenuState = {
  x: number;
  y: number;
  selected: InventoryItem[];
};

const NAVIGABLE_COLUMNS = [1, 2, 3, 4, 5, 8, 9, 10, 11, 12, 13, 14];

function isEditableColumn(column: number): boolean {
  return isWarehouseEditableColumn(column);
}

function parseGridNumber(value: string): number | undefined {
  if (!value.trim()) return undefined;
  const parsed = Number(value.replace(",", "."));
  return Number.isFinite(parsed) ? parsed : undefined;
}

function formatOptionalGridNumber(value: number | undefined | null): string {
  if (value == null || value === 0) return "";
  return String(value);
}

function valueAtCell(row: WarehouseGridRow, column: number): string {
  if (column === 0 || column === WAREHOUSE_ACTION_COLUMN) return "";
  if (row.rowKind === "saved") {
    switch (column) {
      case 1:
        return row.sku;
      case 2:
        return row.name;
      case 3:
        return categoryLabelFromPath(row.categoryPath);
      case 4:
        return row.brandName ?? "";
      case 5:
        return formatOptionalGridNumber(row.totalOnHand);
      case 6:
        return formatOptionalGridNumber(row.totalReserved);
      case 7:
        return formatOptionalGridNumber(row.totalAvailable);
      case 8:
        return formatOptionalGridNumber(row.purchasePrice);
      case 9:
        return formatOptionalGridNumber(row.sellPrice);
      case 10:
        return row.supplierName ?? "";
      case 11:
        return row.barcodes[0] ?? "";
      case 12:
        return row.warehouseLocation ?? "";
      case 13:
        return formatOptionalGridNumber(row.lowStockThreshold);
      case 14:
        return formatWarehouseUpdatedAt(row.updatedAt);
      default:
        return "";
    }
  }
  switch (column) {
    case 1:
      return row.draft.sku;
    case 2:
      return row.draft.name;
    case 3:
      return row.draft.category;
    case 4:
      return row.draft.brandName;
    case 5:
      return row.draft.onHand;
    case 8:
      return row.draft.purchasePrice;
    case 9:
      return row.draft.sellPrice;
    case 10:
      return row.draft.supplierName;
    case 11:
      return row.draft.barcode;
    case 12:
      return row.draft.warehouseLocation;
    case 13:
      return row.draft.lowStockThreshold;
    default:
      return "";
  }
}

function applyCellValue(row: WarehouseGridRow, column: number, value: string): WarehouseGridRow {
  if (row.rowKind === "saved") {
    const next = { ...row };
    switch (column) {
      case 1:
        next.sku = value;
        break;
      case 2:
        next.name = value;
        break;
      case 3:
        next.categoryPath = categoryPathFromLabel(value);
        break;
      case 4:
        next.brandName = value;
        break;
      case 5: {
        const onHand = parseGridNumber(value) ?? 0;
        next.totalOnHand = onHand;
        next.totalAvailable = onHand - next.totalReserved;
        break;
      }
      case 8:
        next.purchasePrice = parseGridNumber(value);
        break;
      case 9:
        next.sellPrice = parseGridNumber(value);
        break;
      case 10:
        next.supplierName = value;
        break;
      case 11: {
        const barcode = normalizeBarcode(value);
        next.barcodes = barcode ? [barcode] : [];
        break;
      }
      case 12:
        next.warehouseLocation = value;
        break;
      case 13:
        next.lowStockThreshold = parseGridNumber(value);
        break;
      default:
        break;
    }
    return next;
  }
  switch (column) {
    case 1:
      return applyWarehouseDraftField(row, "sku", value);
    case 2:
      return applyWarehouseDraftField(row, "name", value);
    case 3:
      return applyWarehouseDraftField(row, "category", value);
    case 4:
      return applyWarehouseDraftField(row, "brandName", value);
    case 5:
      return applyWarehouseDraftField(row, "onHand", value);
    case 8:
      return applyWarehouseDraftField(row, "purchasePrice", value);
    case 9:
      return applyWarehouseDraftField(row, "sellPrice", value);
    case 10:
      return applyWarehouseDraftField(row, "supplierName", value);
    case 11:
      return applyWarehouseDraftField(row, "barcode", value);
    case 12:
      return applyWarehouseDraftField(row, "warehouseLocation", value);
    case 13:
      return applyWarehouseDraftField(row, "lowStockThreshold", value);
    default:
      return row;
  }
}

function isDateColumn(_column: number): boolean {
  return false;
}

function isInteractiveGridTarget(target: EventTarget | null): boolean {
  return target instanceof HTMLElement && Boolean(target.closest("button, a, input, textarea, select"));
}

function rowNeedsCloudSync(
  baseline: InventoryItem | undefined,
  row: WarehouseGridRow,
): boolean {
  if (row.rowKind === "empty") {
    return hasWarehouseDraftContent(row) && warehouseRowHasRequiredFields(row);
  }
  if (row.rowKind === "saved" && savedRowShouldArchive(row)) return true;
  if (!baseline) return true;
  return savedRowMetadataChanged(baseline, row) || savedRowStockChanged(baseline, row);
}

function getContextSelectedItems(rows: WarehouseGridRow[], selection: GridSelectionState): InventoryItem[] {
  const unique = new Map<string, InventoryItem>();
  for (const range of allRanges(selection)) {
    for (let row = range.minRow; row <= range.maxRow; row += 1) {
      const item = rows[row];
      if (!item || item.rowKind !== "saved") continue;
      unique.set(item.id, item);
    }
  }
  return [...unique.values()];
}

export function WarehouseExcelGrid({
  items,
  companyId,
  canEdit,
  repository,
  stockLevelRepository,
  movementRepository,
  warehouseRepository,
  financialRepository,
  activeWarehouseId,
  actorUserId,
  onReceipt,
  onAdjust,
  onSale,
  onTransfer,
  onHistory,
  onCloudPendingChange,
}: WarehouseExcelGridProps) {
  const {
    setSaveStatus,
    setSaveError,
    registerSaveHandler,
    registerGridUndoHandler,
    registerGridRedoHandler,
    registerCloudPushHandler,
    registerSyncHandler,
    gridZoom,
    warehouseItemHighlightId,
    setWarehouseItemHighlightId,
    warehouseBarcodePrefill,
    setWarehouseBarcodePrefill,
  } = useWorkspace();
  const gridEntering = useGridEnterMotion();

  const layout = useMemo(() => buildWarehouseGridLayoutMetrics(gridZoom), [gridZoom]);

  const gridRef = useRef<HTMLDivElement>(null);
  const bodyRef = useRef<HTMLDivElement>(null);
  const commandBusRef = useRef(new GridCommandBus());
  const itemsRef = useRef(items);
  const dirtyRowsRef = useRef<Set<string>>(new Set());
  const editingRowIdRef = useRef<string | null>(null);
  const pendingArchiveIdsRef = useRef<Set<string>>(new Set());
  const pendingRemoteAckRef = useRef<Set<string>>(new Set());
  const localSaveAckRef = useRef<Set<string>>(new Set());
  const cmdADoubleTapRef = useRef(0);
  const isDraggingSelectionRef = useRef(false);
  const pendingSelectionDragRef = useRef<{
    clientX: number;
    clientY: number;
  } | null>(null);
  const isDraggingFillRef = useRef(false);
  const fillSourceRef = useRef<GridRange | null>(null);
  const fillTargetRef = useRef<GridRange | null>(null);
  const dirtyStatusScheduledRef = useRef(false);

  const [rows, setRows] = useState<WarehouseGridRow[]>(() => buildWarehouseGridRows(items));
  const rowsRef = useRef(rows);
  useEffect(() => {
    rowsRef.current = rows;
  }, [rows]);
  const [selection, setSelection] = useState<GridSelectionState>(initialSelection);
  const selectionRef = useRef(selection);
  useEffect(() => {
    selectionRef.current = selection;
  }, [selection]);
  const [editor, setEditor] = useState<EditorState | null>(null);
  const editorRef = useRef<EditorState | null>(null);
  editorRef.current = editor;
  const [scroll, setScroll] = useState({ top: 0, left: 0, width: 0, height: 0 });
  const [contextMenu, setContextMenu] = useState<ContextMenuState | null>(null);
  const [fillPreview, setFillPreview] = useState<GridRange | null>(null);
  const [dirtyVersion, setDirtyVersion] = useState(0);
  const [saveFlashRows, setSaveFlashRows] = useState<Set<string>>(new Set());
  const [scanFlashRows, setScanFlashRows] = useState<Set<string>>(new Set());

  useEffect(() => {
    itemsRef.current = items;
    setRows((current) => {
      const preserveRowIds = new Set([
        ...dirtyRowsRef.current,
        ...pendingRemoteAckRef.current,
        ...(editingRowIdRef.current ? [editingRowIdRef.current] : []),
      ]);
      const next = reconcileWarehouseRowsWithRemote(current, items, preserveRowIds);
      for (const rowId of [...pendingRemoteAckRef.current]) {
        const row = next.find((candidate) => candidate.rowId === rowId);
        if (row?.rowKind !== "saved") continue;
        const item = items.find((candidate) => candidate.id === row.id);
        if (item && warehouseRowMatchesItem(row, item)) {
          pendingRemoteAckRef.current.delete(rowId);
        }
      }
      return next;
    });
  }, [items]);

  useEffect(() => {
    onCloudPendingChange?.(
      dirtyRowsRef.current.size > 0 || pendingArchiveIdsRef.current.size > 0,
    );
  }, [dirtyVersion, onCloudPendingChange]);

  useEffect(() => {
    const dirtyIds = dirtyRowsRef.current;
    if (
      dirtyIds.size === 0 &&
      pendingRemoteAckRef.current.size === 0 &&
      pendingArchiveIdsRef.current.size === 0
    ) {
      setSaveStatus("idle");
      return;
    }
    const hasUnsavedLocal =
      pendingArchiveIdsRef.current.size > 0 ||
      [...dirtyIds].some((rowId) => !localSaveAckRef.current.has(rowId));
    setSaveStatus(hasUnsavedLocal ? "pending" : "saved");
  }, [dirtyVersion, setSaveStatus]);

  const columnWidths = useMemo(() => layout.columns.map((column) => column.width), [layout.columns]);

  const visible = useMemo(() => {
    const viewportHeight = scroll.height > 0 ? scroll.height : 640;
    const viewportWidth = scroll.width > 0 ? scroll.width : 960;

    const rowStart = Math.max(0, Math.floor(scroll.top / layout.rowHeight) - 2);
    const rowEnd = Math.min(
      rows.length - 1,
      rowStart + Math.ceil(viewportHeight / layout.rowHeight) + 4,
    );

    let colStart = 0;
    let x = 0;
    while (colStart < columnWidths.length && x + columnWidths[colStart] <= scroll.left) {
      x += columnWidths[colStart];
      colStart += 1;
    }
    colStart = Math.max(0, colStart - 1);
    let colEnd = colStart;
    let width = 0;
    while (colEnd < columnWidths.length && width < viewportWidth + 240) {
      width += columnWidths[colEnd];
      colEnd += 1;
    }
    colEnd = Math.min(columnWidths.length - 1, colEnd + 1);
    return { rowStart, rowEnd, colStart, colEnd };
  }, [columnWidths, layout.rowHeight, rows.length, scroll.height, scroll.left, scroll.top, scroll.width]);

  const editorAutocompleteMatch = useMemo(
    () =>
      resolveGridColumnAutocomplete(
        editor,
        rows.length,
        (row, column) => valueAtCell(rows[row], column),
        (column) => isEditableColumn(column) && !WAREHOUSE_READ_ONLY_COLUMNS.has(column),
      ),
    [editor, rows],
  );

  const scheduleDirtyStatus = useCallback(() => {
    if (dirtyStatusScheduledRef.current) return;
    dirtyStatusScheduledRef.current = true;
    queueMicrotask(() => {
      dirtyStatusScheduledRef.current = false;
      setDirtyVersion((current) => current + 1);
      setSaveStatus("pending");
    });
  }, [setSaveStatus]);

  const markDirty = useCallback((rowId: string) => {
    const wasAcknowledged = localSaveAckRef.current.delete(rowId);
    const wasDirty = dirtyRowsRef.current.has(rowId);
    dirtyRowsRef.current.add(rowId);
    if (!wasDirty || wasAcknowledged) {
      scheduleDirtyStatus();
    }
  }, [scheduleDirtyStatus]);

  const setCell = useCallback((cell: GridCellAddress, newValue: string, options?: { trackUndo?: boolean; markDirty?: boolean }) => {
    const applyToRows = (current: WarehouseGridRow[]) => {
      const row = current[cell.row];
      if (!row || !isEditableColumn(cell.column)) return current;
      const oldValue = valueAtCell(row, cell.column);
      if (oldValue === newValue) return current;
      const next = [...current];
      const updatedRow = applyCellValue(row, cell.column, newValue);
      next[cell.row] = updatedRow;
      if (options?.trackUndo !== false) {
        commandBusRef.current.commit("Edit Cell", [
          { address: cell, oldValue, newValue },
        ]);
      }
      if (options?.markDirty !== false) {
        const wasAcknowledged = localSaveAckRef.current.delete(updatedRow.rowId);
        const wasDirty = dirtyRowsRef.current.has(updatedRow.rowId);
        dirtyRowsRef.current.add(updatedRow.rowId);
        if (!wasDirty || wasAcknowledged) {
          scheduleDirtyStatus();
        }
      }
      return next;
    };

    const nextRows = applyToRows(rowsRef.current);
    if (nextRows === rowsRef.current) return;
    rowsRef.current = nextRows;
    setRows(nextRows);
  }, [scheduleDirtyStatus]);

  const applyMutation = useCallback((mutation: GridMutation, reverse: boolean) => {
    setCell(mutation.address, reverse ? mutation.oldValue : mutation.newValue, {
      trackUndo: false,
      markDirty: true,
    });
  }, [setCell]);

  const performUndo = useCallback(() => {
    if (!canEdit) return;
    handleGridUndo(commandBusRef.current, applyMutation, editor, setEditor);
    gridRef.current?.focus();
  }, [applyMutation, canEdit, editor]);

  const performRedo = useCallback(() => {
    if (!canEdit) return;
    handleGridRedo(commandBusRef.current, applyMutation);
    gridRef.current?.focus();
  }, [applyMutation, canEdit]);

  const ensureExpanded = useCallback((lastVisibleRow: number) => {
    setRows((current) => {
      const distance = current.length - lastVisibleRow - 1;
      if (distance > WAREHOUSE_GRID_EMPTY_ROWS_THRESHOLD) return current;
      return growWarehouseRows(current, WAREHOUSE_GRID_EMPTY_ROWS_EXPAND);
    });
  }, []);

  const flushEditor = useCallback(() => {
    const currentEditor = editorRef.current;
    if (!currentEditor) return;
    setCell(currentEditor.cell, currentEditor.value);
    editingRowIdRef.current = null;
    setEditor(null);
  }, [setCell]);

  const pushToCloud = useCallback(async () => {
    flushEditor();
    if (!actorUserId || !companyId || !canEdit) return;
    if (dirtyRowsRef.current.size === 0 && pendingArchiveIdsRef.current.size === 0) {
      setSaveStatus("idle");
      return;
    }

    setSaveStatus("saving");
    setSaveError(null);

    try {
      for (const itemId of [...pendingArchiveIdsRef.current]) {
        await repository.archive(itemId, companyId, actorUserId);
      }
      pendingArchiveIdsRef.current.clear();

      const snapshotRows = rowsRef.current;
      const baselineById = new Map(itemsRef.current.map((item) => [item.id, item]));
      const rowReplacements = new Map<string, WarehouseGridRow>();
      const pushedRowIds: string[] = [];

      const rowErrors: string[] = [];

      for (const rowId of [...dirtyRowsRef.current]) {
        const row = snapshotRows.find((item) => item.rowId === rowId);
        if (!row) continue;
        const baseline = row.rowKind === "saved" ? baselineById.get(row.id) : undefined;
        if (!rowNeedsCloudSync(baseline, row)) {
          dirtyRowsRef.current.delete(rowId);
          continue;
        }
        if (row.rowKind === "empty" && !warehouseRowHasRequiredFields(row)) {
          dirtyRowsRef.current.delete(rowId);
          continue;
        }

        try {
          const syncResult = await syncWarehouseGridRowUseCase(
            repository,
            stockLevelRepository,
            movementRepository,
            warehouseRepository,
            financialRepository,
            {
              companyId,
              actorUserId,
              warehouseId: activeWarehouseId,
              row,
              baseline,
            },
          );

          if (syncResult === WAREHOUSE_ROW_ARCHIVED) {
            rowReplacements.set(rowId, createEmptyWarehouseRow());
            dirtyRowsRef.current.delete(rowId);
            continue;
          }

          if (row.rowKind === "empty" && syncResult) {
            rowReplacements.set(rowId, buildSavedRowFromCreate(row, syncResult, companyId));
            pushedRowIds.push(`saved-${syncResult}`);
          } else {
            rowReplacements.set(rowId, row);
            pushedRowIds.push(rowId);
          }
          dirtyRowsRef.current.delete(rowId);
        } catch (rowError) {
          const label =
            row.rowKind === "saved"
              ? row.sku || row.name || "строка"
              : row.draft.sku || row.draft.name || "новая строка";
          rowErrors.push(`${label}: ${mapGridSaveError(rowError)}`);
        }
      }

      if (rowReplacements.size > 0) {
        setRows((current) =>
          current.map((currentRow) => rowReplacements.get(currentRow.rowId) ?? currentRow),
        );
      }

      for (const rowId of pushedRowIds) {
        pendingRemoteAckRef.current.add(rowId);
      }
      localSaveAckRef.current.clear();
      setDirtyVersion((current) => current + 1);

      if (rowErrors.length > 0) {
        setSaveStatus(pushedRowIds.length > 0 ? "saved" : "error");
        setSaveError(
          pushedRowIds.length > 0
            ? `Сохранено ${pushedRowIds.length} строк. Ошибки: ${rowErrors.join(" · ")}`
            : rowErrors.join(" · "),
        );
      } else {
        setSaveStatus("saved");
        setSaveError(null);
      }

      if (pushedRowIds.length > 0) {
        setSaveFlashRows(new Set(pushedRowIds));
        window.setTimeout(() => setSaveFlashRows(new Set()), 450);
      }
      window.setTimeout(() => setSaveStatus("idle"), 1200);
    } catch (error) {
      setSaveStatus("error");
      const message = mapGridSaveError(error);
      setSaveError(message);
      return;
    }
  }, [
    actorUserId,
    canEdit,
    companyId,
    activeWarehouseId,
    financialRepository,
    movementRepository,
    repository,
    flushEditor,
    setSaveError,
    setSaveStatus,
    stockLevelRepository,
    warehouseRepository,
  ]);

  const syncNow = useCallback(async () => {
    await pushToCloud();
  }, [pushToCloud]);

  const runSave = useCallback(() => {
    flushEditor();
  }, [flushEditor]);

  useEffect(() => {
    registerSaveHandler(runSave);
    return () => registerSaveHandler(null);
  }, [registerSaveHandler, runSave]);

  useEffect(() => {
    registerSyncHandler(syncNow);
    return () => registerSyncHandler(null);
  }, [registerSyncHandler, syncNow]);

  useEffect(() => {
    if (!canEdit) {
      registerGridUndoHandler(null);
      registerGridRedoHandler(null);
      return;
    }
    registerGridUndoHandler(performUndo);
    registerGridRedoHandler(performRedo);
    return () => {
      registerGridUndoHandler(null);
      registerGridRedoHandler(null);
    };
  }, [canEdit, performRedo, performUndo, registerGridRedoHandler, registerGridUndoHandler]);

  useEffect(() => {
    registerCloudPushHandler(pushToCloud);
    return () => registerCloudPushHandler(null);
  }, [pushToCloud, registerCloudPushHandler]);

  useEffect(() => {
    function stopSelectionDrag() {
      pendingSelectionDragRef.current = null;
      if (!isDraggingSelectionRef.current) return;
      isDraggingSelectionRef.current = false;
      setSelection((current) => {
        selectionRef.current = current;
        return current;
      });
      gridRef.current?.focus();
    }

    function cellFromPointer(clientX: number, clientY: number): GridCellAddress | null {
      if (!bodyRef.current) return null;
      return resolvePointerCell({
        clientX,
        clientY,
        viewport: bodyRef.current,
        rowCount: rows.length,
        rowHeight: layout.rowHeight,
        headerHeight: layout.headerHeight,
        columns: layout.columns,
        xOffsets: layout.xOffsets,
      });
    }

    function onPointerMove(event: PointerEvent) {
      if (pendingSelectionDragRef.current && !isDraggingSelectionRef.current) {
        const dx = Math.abs(event.clientX - pendingSelectionDragRef.current.clientX);
        const dy = Math.abs(event.clientY - pendingSelectionDragRef.current.clientY);
        if (dx > 4 || dy > 4) {
          isDraggingSelectionRef.current = true;
        }
      }
      if (isDraggingSelectionRef.current) {
        const cell = cellFromPointer(event.clientX, event.clientY);
        if (!cell) return;
        setSelection((current) => {
          const next = dragSelection(current, cell);
          selectionRef.current = next;
          return next;
        });
        ensureExpanded(cell.row);
      }
      if (isDraggingFillRef.current && fillSourceRef.current) {
        const cell = cellFromPointer(event.clientX, event.clientY);
        if (!cell) return;
        const source = fillSourceRef.current;
        const target = normalizeRange(
          { row: source.minRow, column: source.minColumn },
          { row: Math.max(cell.row, source.maxRow), column: Math.max(cell.column, source.maxColumn) },
        );
        fillTargetRef.current = target;
        setFillPreview(target);
        ensureExpanded(target.maxRow);
      }
    }

    function onPointerUp() {
      stopSelectionDrag();
      if (isDraggingFillRef.current && fillSourceRef.current && fillTargetRef.current) {
        const ops = buildFillOperations({
          source: fillSourceRef.current,
          target: fillTargetRef.current,
          valueAt: (cell) => valueAtCell(rows[cell.row], cell.column),
          isEditableColumn,
          isDateColumn,
        });
        const mutations: GridMutation[] = [];
        setRows((current) => {
          const next = [...current];
          for (const operation of ops) {
            if (!next[operation.cell.row]) continue;
            const oldValue = valueAtCell(next[operation.cell.row], operation.cell.column);
            if (oldValue === operation.value) continue;
            next[operation.cell.row] = applyCellValue(next[operation.cell.row], operation.cell.column, operation.value);
            markDirty(next[operation.cell.row].rowId);
            mutations.push({
              address: operation.cell,
              oldValue,
              newValue: operation.value,
            });
          }
          return next;
        });
        commandBusRef.current.commit("Fill Series", mutations);
      }
      isDraggingFillRef.current = false;
      fillSourceRef.current = null;
      fillTargetRef.current = null;
      setFillPreview(null);
    }

    window.addEventListener("pointermove", onPointerMove);
    window.addEventListener("pointerup", onPointerUp);
    return () => {
      window.removeEventListener("pointermove", onPointerMove);
      window.removeEventListener("pointerup", onPointerUp);
    };
  }, [ensureExpanded, layout.columns, layout.headerHeight, layout.rowHeight, layout.xOffsets, markDirty, rows]);

  useEffect(() => {
    function closeContext() {
      setContextMenu(null);
    }
    window.addEventListener("click", closeContext);
    return () => window.removeEventListener("click", closeContext);
  }, []);

  const resolveScrollFrame = useCallback(
    (cell: GridCellAddress) => warehouseCellFrame(layout, cell),
    [layout],
  );
  const { scrollToCell } = useGridScrollIntoView({
    bodyRef,
    selection,
    resolveFrame: resolveScrollFrame,
    headerHeight: layout.headerHeight,
  });

  const focusGrid = useCallback(() => {
    queueMicrotask(() => {
      gridRef.current?.focus();
    });
  }, []);

  const endEdit = useCallback(() => {
    editingRowIdRef.current = null;
    setEditor(null);
    focusGrid();
  }, [focusGrid]);

  const beginEdit = useCallback((cell: GridCellAddress, seed?: string, selectAll = true) => {
    if (!isEditableColumn(cell.column)) return;
    const row = rows[cell.row];
    if (!row || !canEdit) return;
    editingRowIdRef.current = row.rowId;
    markDirty(row.rowId);
    const value = seed ?? valueAtCell(row, cell.column);
    setEditor({ cell, value, initialValue: value, selectAll });
    scrollToCell(cell);
  }, [canEdit, markDirty, rows, scrollToCell]);

  const highlightHandledRef = useRef<string | null>(null);

  useEffect(() => {
    if (!warehouseItemHighlightId) {
      highlightHandledRef.current = null;
      return;
    }
    const rowIndex = rows.findIndex(
      (row) => row.rowKind === "saved" && row.id === warehouseItemHighlightId,
    );
    if (rowIndex < 0) return;
    if (highlightHandledRef.current === warehouseItemHighlightId) return;
    highlightHandledRef.current = warehouseItemHighlightId;

    const row = rows[rowIndex];
    if (!row) return;
    const cell = { row: rowIndex, column: 2 };
    setSelection(clickSelection(selectionRef.current, cell, { shift: false, meta: false }));
    scrollToCell(cell);
    setScanFlashRows(new Set([row.rowId]));
    const timer = window.setTimeout(() => {
      setScanFlashRows(new Set());
      setWarehouseItemHighlightId(null);
    }, 2600);
    return () => window.clearTimeout(timer);
  }, [rows, scrollToCell, setWarehouseItemHighlightId, warehouseItemHighlightId]);

  useEffect(() => {
    if (!warehouseBarcodePrefill || !canEdit) return;
    const barcode = normalizeBarcode(warehouseBarcodePrefill);
    setWarehouseBarcodePrefill(null);
    if (!barcode) return;

    let targetRowId: string | null = null;
    setRows((current) => {
      let next = current;
      let emptyIndex = next.findIndex(
        (row) => row.rowKind === "empty" && !hasWarehouseDraftContent(row),
      );
      if (emptyIndex < 0) {
        next = growWarehouseRows(current, 8);
        emptyIndex = next.findIndex(
          (row) => row.rowKind === "empty" && !hasWarehouseDraftContent(row),
        );
      }
      if (emptyIndex < 0) return current;
      const target = next[emptyIndex];
      if (target.rowKind !== "empty") return current;
      targetRowId = target.rowId;
      const updated = [...next];
      updated[emptyIndex] = {
        ...target,
        draft: {
          ...target.draft,
          barcode,
          sku: target.draft.sku.trim() ? target.draft.sku : barcode,
        },
      };
      return updated;
    });

    if (!targetRowId) return;
    markDirty(targetRowId);
    window.setTimeout(() => {
      const rowIndex = rowsRef.current.findIndex((row) => row.rowId === targetRowId);
      if (rowIndex < 0) return;
      const cell = { row: rowIndex, column: 2 };
      setSelection(clickSelection(selectionRef.current, cell, { shift: false, meta: false }));
      scrollToCell(cell);
      beginEdit(cell);
    }, 0);
  }, [
    beginEdit,
    canEdit,
    markDirty,
    scrollToCell,
    setWarehouseBarcodePrefill,
    warehouseBarcodePrefill,
  ]);

  const commitEditor = useCallback((direction?: "down" | "up" | "left" | "right") => {
    if (!editor) return;
    const { cell, value } = editor;
    setCell(cell, value);
    editingRowIdRef.current = null;
    setEditor(null);
    if (!direction) {
      focusGrid();
      return;
    }
    const next = { ...cell };
    if (direction === "down") next.row += 1;
    if (direction === "up") next.row = Math.max(0, next.row - 1);
    if (direction === "right") next.column = Math.min(layout.columns.length - 1, next.column + 1);
    if (direction === "left") next.column = Math.max(WAREHOUSE_EDITABLE_COL_START, next.column - 1);
    if (!isEditableColumn(next.column)) {
      next.column = Math.max(WAREHOUSE_EDITABLE_COL_START, Math.min(WAREHOUSE_EDITABLE_COL_END, next.column));
    }
    if (next.row >= rows.length) {
      setRows((current) => growWarehouseRows(current, WAREHOUSE_GRID_EMPTY_ROWS_EXPAND));
    }
    setSelection({
      anchor: next,
      head: next,
      cmdRanges: [],
    });
    scrollToCell(next);
    focusGrid();
  }, [editor, focusGrid, layout.columns.length, rows.length, scrollToCell, setCell]);

  const clearRange = useCallback((range: GridRange) => {
    if (!canEdit) return;

    setRows((current) => {
      const next = [...current];
      const mutations: GridMutation[] = [];

      for (let row = range.minRow; row <= range.maxRow; row += 1) {
        for (let column = range.minColumn; column <= range.maxColumn; column += 1) {
          const rowRef = next[row];
          if (!rowRef) continue;
          const clearColumn = resolveWarehouseClearColumn(column);
          if (clearColumn == null) continue;

          const currentValue = valueAtCell(rowRef, clearColumn);
          const updatedRow = applyCellValue(rowRef, clearColumn, "");
          if (updatedRow === rowRef && currentValue.trim() === "") continue;

          next[row] = updatedRow;
          localSaveAckRef.current.delete(updatedRow.rowId);
          dirtyRowsRef.current.add(updatedRow.rowId);
          mutations.push({
            address: { row, column: clearColumn },
            oldValue: currentValue,
            newValue: "",
          });
        }
      }

      if (mutations.length > 0) {
        scheduleDirtyStatus();
        commandBusRef.current.commit("Clear", mutations);
      }

      return next;
    });
  }, [canEdit, scheduleDirtyStatus]);

  const deleteSelectedRows = useCallback(() => {
    if (!canEdit) return;
    const range = primaryRange(selectionRef.current);

    setRows((current) => {
      const next = [...current];
      const mutations: GridMutation[] = [];
      let changed = false;

      for (let row = range.minRow; row <= range.maxRow; row += 1) {
        const rowRef = next[row];
        if (!rowRef) continue;

        if (rowRef.rowKind === "saved") {
          pendingArchiveIdsRef.current.add(rowRef.id);
          dirtyRowsRef.current.delete(rowRef.rowId);
          next[row] = createEmptyWarehouseRow();
          changed = true;
          continue;
        }

        if (rowRef.rowKind === "empty" && hasWarehouseDraftContent(rowRef)) {
          for (let column = WAREHOUSE_EDITABLE_COL_START; column <= WAREHOUSE_EDITABLE_COL_END; column += 1) {
            if (!isEditableColumn(column)) continue;
            const oldValue = valueAtCell(rowRef, column);
            if (!oldValue.trim()) continue;
            next[row] = applyCellValue(next[row], column, "");
            mutations.push({
              address: { row, column },
              oldValue,
              newValue: "",
            });
          }
          dirtyRowsRef.current.delete(rowRef.rowId);
          changed = true;
        }
      }

      if (changed) {
        scheduleDirtyStatus();
      }
      if (mutations.length > 0) {
        commandBusRef.current.commit("Delete Rows", mutations);
      }

      return next;
    });
  }, [canEdit, scheduleDirtyStatus]);

  const clearPrimaryRange = useCallback(() => {
    clearRange(primaryRange(selectionRef.current));
  }, [clearRange]);

  const copyPrimaryRange = useCallback(async () => {
    const range = primaryRange(selection);
    const lines: string[] = [];
    for (let row = range.minRow; row <= range.maxRow; row += 1) {
      const cells: string[] = [];
      for (let column = range.minColumn; column <= range.maxColumn; column += 1) {
        cells.push(valueAtCell(rows[row], column));
      }
      lines.push(cells.join("\t"));
    }
    await navigator.clipboard.writeText(lines.join("\n"));
  }, [rows, selection]);

  const pasteAtSelection = useCallback(async () => {
    const clipboard = await navigator.clipboard.readText();
    if (!clipboard) return;
    const matrix = clipboard.split(/\r?\n/).map((line) => line.split("\t"));
    const start = selection.head;
    const targetMaxRow = start.row + matrix.length - 1;
    if (targetMaxRow >= rows.length - 1) {
      setRows((current) => growWarehouseRows(current, targetMaxRow - current.length + WAREHOUSE_GRID_EMPTY_ROWS_EXPAND + 1));
    }

    const mutations: GridMutation[] = [];
    setRows((current) => {
      const next = [...current];
      for (let r = 0; r < matrix.length; r += 1) {
        const rowIndex = start.row + r;
        if (rowIndex >= next.length) break;
        for (let c = 0; c < matrix[r].length; c += 1) {
          const colIndex = start.column + c;
          if (!isEditableColumn(colIndex)) continue;
          const oldValue = valueAtCell(next[rowIndex], colIndex);
          const newValue = matrix[r][c];
          if (oldValue === newValue) continue;
          next[rowIndex] = applyCellValue(next[rowIndex], colIndex, newValue);
          markDirty(next[rowIndex].rowId);
          mutations.push({
            address: { row: rowIndex, column: colIndex },
            oldValue,
            newValue,
          });
        }
      }
      return next;
    });
    commandBusRef.current.commit("Paste", mutations);
  }, [markDirty, rows.length, selection.head]);

  const fillWithActive = useCallback(() => {
    const range = primaryRange(selection);
    const seed = valueAtCell(rows[selection.head.row], selection.head.column);
    const mutations: GridMutation[] = [];
    setRows((current) => {
      const next = [...current];
      for (let row = range.minRow; row <= range.maxRow; row += 1) {
        for (let col = range.minColumn; col <= range.maxColumn; col += 1) {
          if (!isEditableColumn(col)) continue;
          if (row === selection.head.row && col === selection.head.column) continue;
          const oldValue = valueAtCell(next[row], col);
          if (oldValue === seed) continue;
          next[row] = applyCellValue(next[row], col, seed);
          markDirty(next[row].rowId);
          mutations.push({ address: { row, column: col }, oldValue, newValue: seed });
        }
      }
      return next;
    });
    commandBusRef.current.commit("Ctrl+Enter", mutations);
  }, [markDirty, rows, selection]);

  const fillDown = useCallback(() => {
    const range = primaryRange(selection);
    if (range.maxRow <= range.minRow) return;
    const mutations: GridMutation[] = [];
    setRows((current) => {
      const next = [...current];
      for (let col = range.minColumn; col <= range.maxColumn; col += 1) {
        if (!isEditableColumn(col)) continue;
        const source = valueAtCell(next[range.minRow], col);
        for (let row = range.minRow + 1; row <= range.maxRow; row += 1) {
          const oldValue = valueAtCell(next[row], col);
          if (oldValue === source) continue;
          next[row] = applyCellValue(next[row], col, source);
          markDirty(next[row].rowId);
          mutations.push({ address: { row, column: col }, oldValue, newValue: source });
        }
      }
      return next;
    });
    commandBusRef.current.commit("Fill Down", mutations);
  }, [markDirty, selection]);

  const fillRight = useCallback(() => {
    const range = primaryRange(selection);
    if (range.maxColumn <= range.minColumn) return;
    const mutations: GridMutation[] = [];
    setRows((current) => {
      const next = [...current];
      for (let row = range.minRow; row <= range.maxRow; row += 1) {
        const source = valueAtCell(next[row], range.minColumn);
        for (let col = range.minColumn + 1; col <= range.maxColumn; col += 1) {
          if (!isEditableColumn(col)) continue;
          const oldValue = valueAtCell(next[row], col);
          if (oldValue === source) continue;
          next[row] = applyCellValue(next[row], col, source);
          markDirty(next[row].rowId);
          mutations.push({ address: { row, column: col }, oldValue, newValue: source });
        }
      }
      return next;
    });
    commandBusRef.current.commit("Fill Right", mutations);
  }, [markDirty, selection]);

  const moveSelectionBy = useCallback((dRow: number, dCol: number, extend: boolean) => {
    setSelection((current) => {
      const head = current.head;
      const next: GridCellAddress = {
        row: Math.max(0, Math.min(rows.length - 1, head.row + dRow)),
        column: Math.max(0, Math.min(layout.columns.length - 1, head.column + dCol)),
      };
      if (extend) {
        return { ...current, head: next };
      }
      return {
        anchor: next,
        head: next,
        cmdRanges: [],
      };
    });
  }, [layout.columns.length, rows.length]);

  const handleKeyDown = useCallback(async (event: React.KeyboardEvent<HTMLDivElement>) => {
    const key = event.key;
    const lower = key.toLowerCase();
    const cmd = event.metaKey || event.ctrlKey;
    const shift = event.shiftKey;

    if (isUndoShortcut(event)) {
      event.preventDefault();
      performUndo();
      return;
    }
    if (isRedoShortcut(event)) {
      event.preventDefault();
      performRedo();
      return;
    }

    if (editor) return;

    if (cmd && lower === "c") {
      event.preventDefault();
      await copyPrimaryRange();
      return;
    }
    if (cmd && lower === "x") {
      event.preventDefault();
      await copyPrimaryRange();
      clearPrimaryRange();
      return;
    }
    if (cmd && lower === "v") {
      event.preventDefault();
      await pasteAtSelection();
      return;
    }
    if (event.ctrlKey && key === "Enter") {
      event.preventDefault();
      fillWithActive();
      return;
    }
    if (event.ctrlKey && lower === "d") {
      event.preventDefault();
      fillDown();
      return;
    }
    if (event.ctrlKey && lower === "r") {
      event.preventDefault();
      fillRight();
      return;
    }
    if (cmd && lower === "a") {
      event.preventDefault();
      const now = Date.now();
      const secondTap = now - cmdADoubleTapRef.current <= 600;
      cmdADoubleTapRef.current = now;
      if (secondTap) {
        setSelection({
          anchor: { row: 0, column: 0 },
          head: { row: rows.length - 1, column: layout.columns.length - 1 },
          cmdRanges: [],
        });
      } else {
        const range = boundingDataRange({
          rowCount: rows.length,
          navigableColumns: NAVIGABLE_COLUMNS,
          isEmpty: (row, column) => !valueAtCell(rows[row], column).trim(),
        });
        if (range) {
          setSelection({
            anchor: { row: range.minRow, column: range.minColumn },
            head: { row: range.maxRow, column: range.maxColumn },
            cmdRanges: [],
          });
        }
      }
      return;
    }
    if (event.ctrlKey && key === " ") {
      event.preventDefault();
      setSelection(selectWholeColumn(selection.head.column, rows.length - 1));
      return;
    }
    if (event.shiftKey && key === " ") {
      event.preventDefault();
      setSelection(selectWholeRow(selection.head.row, WAREHOUSE_EDITABLE_COL_START, WAREHOUSE_EDITABLE_COL_END));
      return;
    }
    if (key === "F2") {
      event.preventDefault();
      beginEdit(selection.head, undefined, true);
      return;
    }
    if (key === "Delete" || key === "Backspace") {
      if (!canEdit) return;
      event.preventDefault();
      clearPrimaryRange();
      return;
    }
    if (key === "PageDown" || key === "PageUp") {
      event.preventDefault();
      if (!bodyRef.current) return;
      const delta = Math.max(40, bodyRef.current.clientHeight * 0.85);
      bodyRef.current.scrollTop += key === "PageDown" ? delta : -delta;
      return;
    }
    if (key === "Home") {
      event.preventDefault();
      if (cmd) {
        setSelection({ anchor: { row: 0, column: WAREHOUSE_EDITABLE_COL_START }, head: { row: 0, column: WAREHOUSE_EDITABLE_COL_START }, cmdRanges: [] });
      } else {
        setSelection((current) => ({ ...current, anchor: { row: current.head.row, column: 0 }, head: { row: current.head.row, column: 0 }, cmdRanges: [] }));
      }
      return;
    }
    if (key === "End") {
      event.preventDefault();
      if (cmd) {
        const last = findLastUsedCell({
          rowCount: rows.length,
          navigableColumns: NAVIGABLE_COLUMNS,
          isEmpty: (row, column) => !valueAtCell(rows[row], column).trim(),
        });
        const target = last ?? { row: rows.length - 1, column: layout.columns.length - 1 };
        setSelection({ anchor: target, head: target, cmdRanges: [] });
      } else {
        setSelection((current) => ({
          anchor: { row: current.head.row, column: layout.columns.length - 1 },
          head: { row: current.head.row, column: layout.columns.length - 1 },
          cmdRanges: [],
        }));
      }
      return;
    }
    if (key === "Tab") {
      event.preventDefault();
      moveSelectionBy(0, shift ? -1 : 1, false);
      return;
    }
    if (key === "Enter") {
      event.preventDefault();
      moveSelectionBy(shift ? -1 : 1, 0, false);
      return;
    }
    if (key === "ArrowUp" || key === "ArrowDown" || key === "ArrowLeft" || key === "ArrowRight") {
      event.preventDefault();
      if (cmd) {
        const head = selection.head;
        if (key === "ArrowLeft" || key === "ArrowRight") {
          const target = jumpColumnInRow({
            row: head.row,
            fromColumn: head.column,
            direction: key === "ArrowRight" ? 1 : -1,
            navigableColumns: NAVIGABLE_COLUMNS,
            isEmpty: (row, column) => !valueAtCell(rows[row], column).trim(),
          });
          setSelection({ anchor: { row: head.row, column: target }, head: { row: head.row, column: target }, cmdRanges: [] });
        } else {
          const target = jumpRowInColumn({
            column: head.column,
            fromRow: head.row,
            direction: key === "ArrowDown" ? 1 : -1,
            rowCount: rows.length,
            isEmpty: (row, column) => !valueAtCell(rows[row], column).trim(),
          });
          setSelection({ anchor: { row: target, column: head.column }, head: { row: target, column: head.column }, cmdRanges: [] });
        }
        return;
      }
      if (key === "ArrowUp") moveSelectionBy(-1, 0, shift);
      if (key === "ArrowDown") moveSelectionBy(1, 0, shift);
      if (key === "ArrowLeft") moveSelectionBy(0, -1, shift);
      if (key === "ArrowRight") moveSelectionBy(0, 1, shift);
      return;
    }
    if (!cmd && !event.altKey && !event.ctrlKey && key.length === 1 && canEdit) {
      event.preventDefault();
      beginEdit(selection.head, key, false);
    }
  }, [
    beginEdit,
    canEdit,
    clearPrimaryRange,
    copyPrimaryRange,
    editor,
    fillDown,
    fillRight,
    fillWithActive,
    layout.columns.length,
    moveSelectionBy,
    pasteAtSelection,
    performRedo,
    performUndo,
    rows,
    selection,
  ]);

  useEffect(() => {
    const viewport = bodyRef.current;
    if (!viewport) return;

    const syncScrollMetrics = () => {
      setScroll((current) => {
        const next = {
          top: viewport.scrollTop,
          left: viewport.scrollLeft,
          width: viewport.clientWidth,
          height: viewport.clientHeight,
        };
        if (
          current.top === next.top &&
          current.left === next.left &&
          current.width === next.width &&
          current.height === next.height
        ) {
          return current;
        }
        return next;
      });
    };

    syncScrollMetrics();
    const observer = new ResizeObserver(syncScrollMetrics);
    observer.observe(viewport);
    return () => observer.disconnect();
  }, [rows.length]);

  const primary = primaryRange(selection);
  const fillHandleCell: GridCellAddress | null = useMemo(() => {
    const col = Math.min(primary.maxColumn, WAREHOUSE_EDITABLE_COL_END);
    if (!isEditableColumn(col)) return null;
    return { row: primary.maxRow, column: col };
  }, [primary.maxColumn, primary.maxRow]);

  return (
    <div className="animate-autocore-grid-enter relative flex h-full min-h-0 flex-col bg-card">
      <div
        ref={gridRef}
        tabIndex={0}
        data-grid-root
        className="relative min-h-0 flex-1 overflow-hidden outline-none"
        onKeyDown={handleKeyDown}
      >
        <div
          className="absolute inset-0 overflow-auto bg-card excel-grid-scroll"
          ref={bodyRef}
          onScroll={(event) => {
            const target = event.currentTarget;
            setScroll((current) => {
              const next = {
                top: target.scrollTop,
                left: target.scrollLeft,
                width: target.clientWidth,
                height: target.clientHeight,
              };
              if (
                current.top === next.top &&
                current.left === next.left &&
                current.width === next.width &&
                current.height === next.height
              ) {
                return current;
              }
              return next;
            });
            ensureExpanded(Math.floor((target.scrollTop + target.clientHeight) / layout.rowHeight));
          }}
          onMouseDown={(event) => {
            if (!editor) return;
            const target = event.target;
            if (target instanceof Node && gridRef.current?.contains(target)) return;
            endEdit();
          }}
        >
          <div
            className="relative"
            style={{
              width: layout.totalWidth,
              height: layout.headerHeight + rows.length * layout.rowHeight,
              fontSize: `${Math.max(11, Math.round(13 * gridZoom))}px`,
            }}
          >
            <div
              className="autocore-grid-header-enter sticky top-0 z-10 border-b bg-muted"
              style={{ height: layout.headerHeight }}
            >
              {layout.columns.map((column, colIdx) => {
                if (colIdx < visible.colStart || colIdx > visible.colEnd) return null;
                return (
                  <button
                    key={column.id}
                    type="button"
                    className={cn(
                      "absolute top-0 flex border-r px-2 text-[11px] font-semibold tracking-[0.01em] text-muted-foreground",
                      column.align === "center" ? "items-center justify-center" : "items-center justify-start",
                    )}
                    style={{
                      left: layout.xOffsets[colIdx],
                      width: column.width,
                      height: layout.headerHeight,
                    }}
                    onClick={() => {
                      if (!isEditableColumn(colIdx)) return;
                      setSelection(selectWholeColumnActiveTop(colIdx, rows.length - 1));
                    }}
                  >
                    {column.title}
                  </button>
                );
              })}
            </div>

            <div
              className={cn("absolute left-0 right-0", gridEntering && "autocore-grid-rows-enter")}
              style={{ top: layout.headerHeight }}
            >
              {Array.from({ length: visible.rowEnd - visible.rowStart + 1 }, (_, offset) => {
                const rowIdx = visible.rowStart + offset;
                const row = rows[rowIdx];
                if (!row) return null;

                return (
                  <div
                    key={row.rowId}
                    className="transition-[height] duration-200 ease-out"
                    style={{ height: layout.rowHeight, ["--grid-row-i" as string]: offset }}
                  >
                    {Array.from({ length: visible.colEnd - visible.colStart + 1 }, (_, colOffset) => {
                      const colIdx = visible.colStart + colOffset;
                      const column = layout.columns[colIdx];
                      const selected = allRanges(selection).some((range) =>
                        isCellInsideRange({ row: rowIdx, column: colIdx }, range),
                      );
                      const focused = selection.head.row === rowIdx && selection.head.column === colIdx;
                      const cell = warehouseCellFrame(layout, { row: rowIdx, column: colIdx });
                      const displayValue =
                        colIdx === 0 ? String(rowIdx + 1) : valueAtCell(row, colIdx);

                      const outOfStock = row.rowKind === "saved" && isWarehouseRowOutOfStock(row);
                      const lowStock = row.rowKind === "saved" && !outOfStock && isWarehouseRowLowStock(row);

                      return (
                        <div
                          key={`${row.rowId}-${column.id}`}
                          className={cn(
                            "absolute flex border-r border-b px-2 text-[13px] leading-5 whitespace-nowrap transition-[background-color,box-shadow] duration-150 ease-out motion-reduce:transition-none",
                            column.align === "center" ? "items-center justify-center" : "items-center justify-start",
                            outOfStock && "bg-destructive/18 text-destructive",
                            selected && !outOfStock && "bg-emerald-500/12",
                            focused && "z-[2] ring-2 ring-inset",
                            saveFlashRows.has(row.rowId) && !outOfStock && "bg-emerald-400/20",
                            scanFlashRows.has(row.rowId) &&
                              !outOfStock &&
                              "bg-primary/12 ring-2 ring-inset ring-primary/40",
                            lowStock && (colIdx === 5 || colIdx === 7) && "text-amber-700 dark:text-amber-300",
                            colIdx === 6 && !outOfStock && "text-muted-foreground",
                            colIdx === 15 && "text-muted-foreground text-[11px]",
                          )}
                          style={{
                            left: cell.x,
                            top: cell.y,
                            width: cell.width,
                            height: cell.height,
                            ...(outOfStock
                              ? { backgroundColor: "color-mix(in oklab, var(--destructive) 16%, transparent)" }
                              : selected
                                ? { backgroundColor: gridPalette.selectionFill }
                                : {}),
                            ...(focused
                              ? {
                                  boxShadow: `inset 0 0 0 2px ${outOfStock ? "color-mix(in oklab, var(--destructive) 70%, transparent)" : gridPalette.activeBorder}`,
                                }
                              : {}),
                          }}
                          onPointerDown={(event) => {
                            if (isInteractiveGridTarget(event.target)) return;
                            event.preventDefault();
                            event.stopPropagation();
                            gridRef.current?.focus();
                            if (colIdx === 0) {
                              setSelection(
                                selectWholeRowActiveStart(
                                  rowIdx,
                                  WAREHOUSE_EDITABLE_COL_START,
                                  WAREHOUSE_EDITABLE_COL_END,
                                ),
                              );
                              return;
                            }
                            const next = clickSelection(selectionRef.current, { row: rowIdx, column: colIdx }, {
                              shift: event.shiftKey,
                              meta: event.metaKey || event.ctrlKey,
                            });
                            selectionRef.current = next;
                            setSelection(next);
                            if (!event.shiftKey && !(event.metaKey || event.ctrlKey)) {
                              isDraggingSelectionRef.current = false;
                              pendingSelectionDragRef.current = {
                                clientX: event.clientX,
                                clientY: event.clientY,
                              };
                              event.currentTarget.setPointerCapture(event.pointerId);
                            }
                            if (event.detail === 2 && isEditableColumn(colIdx)) {
                              beginEdit({ row: rowIdx, column: colIdx });
                            }
                          }}
                          onContextMenu={(event) => {
                            event.preventDefault();
                            const clicked = { row: rowIdx, column: colIdx };
                            const nextSelection = isCellInsideRange(clicked, primaryRange(selection))
                              ? selection
                              : selectWholeRow(rowIdx, WAREHOUSE_EDITABLE_COL_START, WAREHOUSE_EDITABLE_COL_END);
                            if (nextSelection !== selection) {
                              setSelection(nextSelection);
                            }
                            setContextMenu({
                              x: event.clientX,
                              y: event.clientY,
                              selected: getContextSelectedItems(rows, nextSelection),
                            });
                          }}
                        >
                          {colIdx === WAREHOUSE_ACTION_COLUMN ? (
                            row.rowKind === "saved" && row.sku.trim() && canEdit ? (
                              <button
                                type="button"
                                className="rounded border border-emerald-500/30 bg-emerald-500/10 px-2 py-0.5 text-[11px] text-emerald-700"
                                onPointerDown={(event) => event.stopPropagation()}
                                onClick={(event) => {
                                  event.stopPropagation();
                                  onSale(row);
                                }}
                              >
                                Продать
                              </button>
                            ) : null
                          ) : (
                            <span className="truncate">{displayValue}</span>
                          )}
                        </div>
                      );
                    })}
                  </div>
                );
              })}

              {allRanges(selection).map((range, idx) => {
                const left = layout.xOffsets[range.minColumn];
                const right = layout.xOffsets[range.maxColumn] + layout.columns[range.maxColumn].width;
                const top = range.minRow * layout.rowHeight;
                const height = (range.maxRow - range.minRow + 1) * layout.rowHeight;
                return (
                  <div
                    key={`range-${idx}`}
                    className={cn(
                      "pointer-events-none absolute transition-all duration-200 ease-out motion-reduce:transition-none",
                      idx === 0 ? "border-2" : "border",
                    )}
                    style={{
                      left,
                      top,
                      width: right - left,
                      height,
                      borderColor: idx === 0 ? gridPalette.activeBorder : "rgba(22, 163, 74, 0.55)",
                    }}
                  />
                );
              })}

              {fillPreview ? (
                <div
                  className="pointer-events-none absolute animate-autocore-fade-in border-2 border-dashed opacity-80 transition-opacity duration-200 motion-reduce:transition-none"
                  style={{
                    left: layout.xOffsets[fillPreview.minColumn],
                    top: fillPreview.minRow * layout.rowHeight,
                    width:
                      layout.xOffsets[fillPreview.maxColumn] +
                      layout.columns[fillPreview.maxColumn].width -
                      layout.xOffsets[fillPreview.minColumn],
                    height: (fillPreview.maxRow - fillPreview.minRow + 1) * layout.rowHeight,
                    borderColor: gridPalette.activeBorder,
                  }}
                />
              ) : null}

              {fillHandleCell ? (
                <GridFillHandle
                  x={layout.xOffsets[fillHandleCell.column] + layout.columns[fillHandleCell.column].width - 7}
                  y={fillHandleCell.row * layout.rowHeight + layout.rowHeight - 7}
                  onPointerDown={(event) => {
                    event.stopPropagation();
                    isDraggingFillRef.current = true;
                    fillSourceRef.current = primaryRange(selection);
                    fillTargetRef.current = primaryRange(selection);
                    setFillPreview(primaryRange(selection));
                  }}
                  onDoubleClick={() => {
                    const source = primaryRange(selection);
                    const lastDataRow = rows.reduce((acc, row, index) => {
                      return hasWarehouseDraftContent(row) ? index : acc;
                    }, source.maxRow);
                    if (lastDataRow <= source.maxRow) return;
                    const target = {
                      minRow: source.minRow,
                      maxRow: lastDataRow,
                      minColumn: source.minColumn,
                      maxColumn: source.maxColumn,
                    };
                    const ops = buildFillOperations({
                      source,
                      target,
                      valueAt: (cell) => valueAtCell(rows[cell.row], cell.column),
                      isEditableColumn,
                      isDateColumn,
                    });
                    const mutations: GridMutation[] = [];
                    setRows((current) => {
                      const next = [...current];
                      for (const operation of ops) {
                        const oldValue = valueAtCell(next[operation.cell.row], operation.cell.column);
                        if (oldValue === operation.value) continue;
                        next[operation.cell.row] = applyCellValue(next[operation.cell.row], operation.cell.column, operation.value);
                        markDirty(next[operation.cell.row].rowId);
                        mutations.push({
                          address: operation.cell,
                          oldValue,
                          newValue: operation.value,
                        });
                      }
                      return next;
                    });
                    commandBusRef.current.commit("Fill Series", mutations);
                  }}
                />
              ) : null}

              {editor ? (
                <GridEditorOverlay
                  editorKey={`${editor.cell.row}-${editor.cell.column}`}
                  value={editor.value}
                  selectAll={editor.selectAll}
                  frame={warehouseCellFrame(layout, editor.cell)}
                  onChange={(value) => setEditor((current) => (current ? { ...current, value } : current))}
                  onCommit={(direction) => commitEditor(direction)}
                  onCancel={endEdit}
                  autocompleteMatch={editorAutocompleteMatch}
                />
              ) : null}
            </div>
          </div>
        </div>
        <GridZoomControl />
      </div>

      {contextMenu ? (
        <div
          className="animate-tab-enter fixed z-40 min-w-[170px] rounded-md border bg-popover p-1 shadow-md"
          style={{ left: contextMenu.x, top: contextMenu.y }}
        >
          {canEdit ? (
            <button
              type="button"
              className="block w-full rounded px-3 py-1.5 text-left text-sm text-destructive hover:bg-muted"
              onClick={() => {
                deleteSelectedRows();
                setContextMenu(null);
              }}
            >
              Удалить строку
            </button>
          ) : null}
          {contextMenu.selected.length > 0 ? (
            <>
              <button
                type="button"
                className="block w-full rounded px-3 py-1.5 text-left text-sm hover:bg-muted"
                onClick={() => {
                  const target = contextMenu.selected[0];
                  if (target) onReceipt(target);
                  setContextMenu(null);
                }}
              >
                Приход
              </button>
              <button
                type="button"
                className="block w-full rounded px-3 py-1.5 text-left text-sm hover:bg-muted"
                onClick={() => {
                  const target = contextMenu.selected[0];
                  if (target) onAdjust(target);
                  setContextMenu(null);
                }}
              >
                Корректировка
              </button>
              <button
                type="button"
                className="block w-full rounded px-3 py-1.5 text-left text-sm hover:bg-muted"
                onClick={() => {
                  const target = contextMenu.selected[0];
                  if (target) onTransfer(target);
                  setContextMenu(null);
                }}
              >
                Перемещение
              </button>
              <button
                type="button"
                className="block w-full rounded px-3 py-1.5 text-left text-sm hover:bg-muted"
                onClick={() => {
                  const target = contextMenu.selected[0];
                  if (target) onHistory(target);
                  setContextMenu(null);
                }}
              >
                История
              </button>
            </>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}
