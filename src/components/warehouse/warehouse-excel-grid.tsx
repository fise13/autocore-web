"use client";

import { MapPin, PackagePlus, SlidersHorizontal } from "lucide-react";
import { useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";

import { syncWarehouseGridRowUseCase } from "@/application/use-cases/warehouse/sync-warehouse-grid-row";
import { DomainDictionaryContext } from "@/components/domain/domain-dictionary-provider";
import { GridEditorOverlay } from "@/components/grid/grid-editor-overlay";
import { GridFillHandle } from "@/components/grid/grid-fill-handle";
import { GridPhotoCell, GridPhotoCellDisabledHint } from "@/components/grid/grid-photo-cell";
import {
  GridContextMenu,
  GridContextMenuItem,
  GridContextMenuSeparator,
} from "@/components/grid/grid-context-menu";
import { usePanelActive } from "@/components/layout/panel-active-context";
import { useWorkspace } from "@/components/layout/workspace-context";
import { useGridPersistenceAdapter } from "@/components/persistence/use-grid-persistence-adapter";
import { GridZoomControl } from "@/components/motors/grid-zoom-control";
import { InventoryItem } from "@/domain/inventory";
import { useExcelGridInteraction } from "@/hooks/use-excel-grid-interaction";
import { buildFillOperations, resolveFillDragTarget } from "@/lib/grid/grid-fill-engine";
import { GridMutation, GridCommandBus } from "@/lib/grid/grid-command-bus";
import { deleteShortcutLabel, modShortcutLabel } from "@/lib/grid/grid-keyboard-shortcuts";
import { resolvePointerCellClamped } from "@/lib/grid/pointer-to-cell";
import { useGridScrollWhileDrag } from "@/lib/grid/grid-scroll-while-drag";
import { useGridScrollIntoView } from "@/lib/grid/scroll-into-view";
import { gridHeaderFontSizePx } from "@/lib/grid/grid-density";
import { handleGridRedo, handleGridUndo } from "@/lib/grid/grid-undo-redo";
import {
  allRanges,
  clickSelection,
  dragSelection,
  GridSelectionState,
  initialSelection,
  primaryRange,
  selectWholeColumnActiveTop,
  selectWholeRow,
  selectWholeRowActiveStart,
} from "@/lib/grid/selection-controller";
import { GridCellAddress, GridRange, isCellInsideRange } from "@/lib/grid/grid-types";
import type { DomainCategory } from "@/lib/domain/types";
import { filterColumnSuggestions, resolveGridColumnAutocomplete } from "@/lib/grid/grid-column-autocomplete";
import { gridPalette } from "@/lib/grid/grid-palette";
import {
  applyWarehouseDraftField,
  applyWarehouseDraftImageUrls,
  buildSavedRowFromCreate,
  buildWarehouseGridRows,
  createEmptyWarehouseRow,
  growWarehouseRows,
  hasWarehouseDraftContent,
  buildWarehouseReconcilePreserveIds,
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
import { resolveItemLocationLabel } from "@/lib/warehouse/resolve-item-location-label";
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
  WAREHOUSE_PHOTO_COLUMN,
  WAREHOUSE_READ_ONLY_COLUMNS,
  warehouseCellFrame,
} from "@/lib/warehouse/warehouse-grid-layout-engine";
import { normalizeBarcode } from "@/lib/warehouse/warehouse-search";
import { emitKnowledgeEvent } from "@/lib/knowledge/knowledge-api.client";
import { InventoryItemRepository } from "@/infrastructure/firestore/inventory-item-repository";
import { InventoryMovementRepository } from "@/infrastructure/firestore/inventory-movement-repository";
import { InventoryStockLevelRepository } from "@/infrastructure/firestore/inventory-stock-level-repository";
import { FinancialOperationRepository } from "@/infrastructure/firestore/financial-operation-repository";
import { WarehouseRepository } from "@/infrastructure/firestore/warehouse-repository";
import { formatGroupedNumber, parseGroupedNumber } from "@/lib/money/format-number";
import { mapAuthError, mapGridSaveError, userCopy } from "@/lib/user-copy";
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
  onAssignLocation?: (items: InventoryItem[]) => void;
  onCloudPendingChange?: (pending: boolean) => void;
  onDirtyCountChange?: (count: number) => void;
  externalInteractionLocked?: boolean;
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
  cell: GridCellAddress;
  selected: InventoryItem[];
};

const NAVIGABLE_COLUMNS = [1, 2, 3, 4, 7, 8, 9, 10, 11, 12, 13, 14, 15];

function isEditableColumn(column: number): boolean {
  return isWarehouseEditableColumn(column);
}

function parseGridNumber(value: string): number | undefined {
  if (!value.trim()) return undefined;
  const parsed = parseGroupedNumber(value);
  return Number.isFinite(parsed) ? parsed : undefined;
}

function formatOptionalGridNumber(value: number | undefined | null): string {
  if (value == null || value === 0) return "";
  return formatGroupedNumber(value);
}

function formatDraftGridNumber(value: string): string {
  if (!value.trim()) return "";
  const parsed = parseGroupedNumber(value);
  return Number.isFinite(parsed) ? formatGroupedNumber(parsed) : value;
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
        return row.brandName ?? "";
      case 4:
        return formatOptionalGridNumber(row.totalOnHand);
      case 5:
        return formatOptionalGridNumber(row.totalReserved);
      case 6:
        return formatOptionalGridNumber(row.totalAvailable);
      case 7:
        return formatOptionalGridNumber(row.purchasePrice);
      case 8:
        return formatOptionalGridNumber(row.sellPrice);
      case 9:
        return row.supplierName ?? "";
      case 10:
        return row.barcodes[0] ?? "";
      case 11:
        return resolveItemLocationLabel(row);
      case 12:
        return row.notes ?? "";
      case 13:
        return row.quality ?? "";
      case 14:
        return "";
      case 15:
        return formatOptionalGridNumber(row.lowStockThreshold);
      case 16:
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
      return row.draft.brandName;
    case 4:
      return formatDraftGridNumber(row.draft.onHand);
    case 7:
      return formatDraftGridNumber(row.draft.purchasePrice);
    case 8:
      return formatDraftGridNumber(row.draft.sellPrice);
    case 9:
      return row.draft.supplierName;
    case 10:
      return row.draft.barcode;
    case 11:
      return row.draft.warehouseLocation;
    case 12:
      return row.draft.notes;
    case 13:
      return row.draft.quality;
    case 14:
      return "";
    case 15:
      return formatDraftGridNumber(row.draft.lowStockThreshold);
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
        next.brandName = value;
        break;
      case 4: {
        const onHand = parseGridNumber(value) ?? 0;
        next.totalOnHand = onHand;
        next.totalAvailable = onHand - next.totalReserved;
        break;
      }
      case 7:
        next.purchasePrice = parseGridNumber(value);
        break;
      case 8:
        next.sellPrice = parseGridNumber(value);
        break;
      case 9:
        next.supplierName = value;
        break;
      case 10: {
        const barcode = normalizeBarcode(value);
        next.barcodes = barcode ? [barcode] : [];
        break;
      }
      case 11:
        next.warehouseLocation = value;
        break;
      case 12:
        next.notes = value;
        break;
      case 13:
        next.quality = value;
        break;
      case 15:
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
      return applyWarehouseDraftField(row, "brandName", value);
    case 4:
      return applyWarehouseDraftField(row, "onHand", value);
    case 7:
      return applyWarehouseDraftField(row, "purchasePrice", value);
    case 8:
      return applyWarehouseDraftField(row, "sellPrice", value);
    case 9:
      return applyWarehouseDraftField(row, "supplierName", value);
    case 10:
      return applyWarehouseDraftField(row, "barcode", value);
    case 11:
      return applyWarehouseDraftField(row, "warehouseLocation", value);
    case 12:
      return applyWarehouseDraftField(row, "notes", value);
    case 13:
      return applyWarehouseDraftField(row, "quality", value);
    case 15:
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
  onAssignLocation,
  onCloudPendingChange,
  onDirtyCountChange,
  externalInteractionLocked = false,
}: WarehouseExcelGridProps) {
  const isActive = usePanelActive();
  const {
    setSaveStatus,
    setSaveError,
    setGridInteractionLocked,
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

  const dictionaryContext = useContext(DomainDictionaryContext);

  const [scroll, setScroll] = useState({ top: 0, left: 0, width: 0, height: 0 });
  const layout = useMemo(
    () => buildWarehouseGridLayoutMetrics(gridZoom, { containerWidth: scroll.width }),
    [gridZoom, scroll.width],
  );

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
    pointerId: number;
    target: HTMLElement;
  } | null>(null);
  const isDraggingFillRef = useRef(false);
  const fillSourceRef = useRef<GridRange | null>(null);
  const fillTargetRef = useRef<GridRange | null>(null);
  const dirtyStatusScheduledRef = useRef(false);
  const pendingRemoteItemsRef = useRef<InventoryItem[] | null>(null);
  const pendingDictionaryEntriesRef = useRef<Array<{ category: DomainCategory; name: string }>>([]);
  const lastDragPointerRef = useRef({ x: 0, y: 0 });
  const onDragAutoScrollTickRef = useRef<() => void>(() => {});

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
  const [contextMenu, setContextMenu] = useState<ContextMenuState | null>(null);
  const [fillPreview, setFillPreview] = useState<GridRange | null>(null);
  const [dirtyVersion, setDirtyVersion] = useState(0);
  const [saveFlashRows, setSaveFlashRows] = useState<Set<string>>(new Set());
  const [scanFlashRows, setScanFlashRows] = useState<Set<string>>(new Set());
  const [suggestionsOpen, setSuggestionsOpen] = useState(false);

  const contextMenuRowId = useMemo(() => {
    if (!contextMenu) return null;
    return rows[contextMenu.cell.row]?.rowId ?? null;
  }, [contextMenu, rows]);

  const isInteractionLocked = Boolean(
    editor || contextMenu || suggestionsOpen || externalInteractionLocked,
  );

  const dirtyRowIdsForUi = useMemo(
    () => new Set(dirtyRowsRef.current),
    [dirtyVersion],
  );

  const applyRemoteReconcile = useCallback(
    (incomingItems: InventoryItem[]) => {
      setRows((current) => {
        const preserveRowIds = buildWarehouseReconcilePreserveIds({
          dirtyRowIds: dirtyRowsRef.current,
          pendingAckRowIds: pendingRemoteAckRef.current,
          editingRowId: editingRowIdRef.current,
          contextMenuRowId,
        });
        const next = reconcileWarehouseRowsWithRemote(current, incomingItems, preserveRowIds);
        for (const rowId of [...pendingRemoteAckRef.current]) {
          const row = next.find((candidate) => candidate.rowId === rowId);
          if (row?.rowKind !== "saved") continue;
          const item = incomingItems.find((candidate) => candidate.id === row.id);
          if (item && warehouseRowMatchesItem(row, item)) {
            pendingRemoteAckRef.current.delete(rowId);
          }
        }
        return next;
      });
    },
    [contextMenuRowId],
  );

  useEffect(() => {
    itemsRef.current = items;
    if (isInteractionLocked) {
      pendingRemoteItemsRef.current = items;
      return;
    }
    pendingRemoteItemsRef.current = null;
    applyRemoteReconcile(items);
  }, [applyRemoteReconcile, isInteractionLocked, items]);

  useEffect(() => {
    if (isInteractionLocked) return;
    const pending = pendingRemoteItemsRef.current;
    if (!pending) return;
    pendingRemoteItemsRef.current = null;
    applyRemoteReconcile(pending);
  }, [applyRemoteReconcile, isInteractionLocked]);

  useEffect(() => {
    if (!isActive) return;
    setGridInteractionLocked(isInteractionLocked);
    return () => setGridInteractionLocked(false);
  }, [isActive, isInteractionLocked, setGridInteractionLocked]);

  useEffect(() => {
    if (!isActive) return;
    const count = dirtyRowsRef.current.size + pendingArchiveIdsRef.current.size;
    onCloudPendingChange?.(count > 0);
    onDirtyCountChange?.(count);
  }, [dirtyVersion, isActive, onCloudPendingChange, onDirtyCountChange]);

  useEffect(() => {
    if (!isActive) return;
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
  }, [dirtyVersion, isActive, setSaveStatus]);

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

  const editorAutocompleteMatch = useMemo(() => {
    return resolveGridColumnAutocomplete(
      editor,
      rows.length,
      (row, column) => valueAtCell(rows[row], column),
      (column) => isEditableColumn(column) && !WAREHOUSE_READ_ONLY_COLUMNS.has(column),
    );
  }, [editor, rows]);

  const editorSuggestionList = useMemo(() => {
    if (!editor) return [] as string[];
    const fromRows: string[] = [];
    for (let row = 0; row < rows.length; row += 1) {
      if (row === editor.cell.row) continue;
      const cellValue = valueAtCell(rows[row], editor.cell.column).trim();
      if (cellValue) fromRows.push(cellValue);
    }
    return filterColumnSuggestions(editor.value, fromRows);
  }, [editor, rows]);

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

  const reconcilePendingArchives = useCallback(() => {
    let changed = false;
    for (const itemId of [...pendingArchiveIdsRef.current]) {
      const row = rowsRef.current.find(
        (candidate) => candidate.rowKind === "saved" && candidate.id === itemId,
      );
      if (row?.rowKind === "saved" && !savedRowShouldArchive(row)) {
        pendingArchiveIdsRef.current.delete(itemId);
        changed = true;
      }
    }
    if (changed) {
      scheduleDirtyStatus();
    }
  }, [scheduleDirtyStatus]);

  const performUndo = useCallback(() => {
    if (!canEdit) return;
    handleGridUndo(commandBusRef.current, applyMutation, editor, setEditor);
    reconcilePendingArchives();
    gridRef.current?.focus();
  }, [applyMutation, canEdit, editor, reconcilePendingArchives]);

  const performRedo = useCallback(() => {
    if (!canEdit) return;
    handleGridRedo(commandBusRef.current, applyMutation);
    reconcilePendingArchives();
    gridRef.current?.focus();
  }, [applyMutation, canEdit, reconcilePendingArchives]);

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

  const queueDictionaryEntry = useCallback((category: DomainCategory, name: string) => {
    const trimmed = name.trim();
    if (!trimmed) return;
    const exists = pendingDictionaryEntriesRef.current.some(
      (entry) => entry.category === category && entry.name.toLowerCase() === trimmed.toLowerCase(),
    );
    if (exists) return;
    pendingDictionaryEntriesRef.current.push({ category, name: trimmed });
  }, []);

  const flushPendingDictionaryEntries = useCallback(async () => {
    if (!dictionaryContext || pendingDictionaryEntriesRef.current.length === 0) return;
    const pending = [...pendingDictionaryEntriesRef.current];
    pendingDictionaryEntriesRef.current = [];
    for (const entry of pending) {
      try {
        await dictionaryContext.addCompanyEntry(entry.category, entry.name);
      } catch {
        pendingDictionaryEntriesRef.current.push(entry);
      }
    }
  }, [dictionaryContext]);

  const pushToCloud = useCallback(async () => {
    flushEditor();
    if (!actorUserId || !companyId || !canEdit) return;
    if (dirtyRowsRef.current.size === 0 && pendingArchiveIdsRef.current.size === 0) {
      if (pendingDictionaryEntriesRef.current.length > 0) {
        await flushPendingDictionaryEntries();
      }
      setSaveStatus("idle");
      return;
    }

    setSaveStatus("saving");
    setSaveError(null);

    try {
      await flushPendingDictionaryEntries();
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

          const committedBrandName =
            row.rowKind === "empty" ? row.draft.brandName.trim() : row.brandName?.trim();
          if (committedBrandName && committedBrandName !== (baseline?.brandName ?? "").trim()) {
            void emitKnowledgeEvent({
              type: "field.committed",
              payload: { fieldKey: "brandName", fieldValue: committedBrandName, scope: "company" },
            });
          }
        } catch (rowError) {
          const label =
            row.rowKind === "saved"
              ? row.sku || row.name || userCopy.warehouse.excelGrid.rowFallback
              : row.draft.sku || row.draft.name || userCopy.warehouse.excelGrid.newRowFallback;
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
            ? userCopy.warehouse.excelGrid.savedWithErrors(pushedRowIds.length, rowErrors.join(" · "))
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
    flushPendingDictionaryEntries,
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
    if (!isActive) return;
    registerSaveHandler(runSave);
    return () => registerSaveHandler(null);
  }, [isActive, registerSaveHandler, runSave]);

  useEffect(() => {
    if (!isActive) return;
    registerSyncHandler(syncNow);
    return () => registerSyncHandler(null);
  }, [isActive, registerSyncHandler, syncNow]);

  useEffect(() => {
    if (!isActive) return;
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
  }, [
    canEdit,
    isActive,
    performRedo,
    performUndo,
    registerGridRedoHandler,
    registerGridUndoHandler,
  ]);

  useEffect(() => {
    if (!isActive) return;
    registerCloudPushHandler(pushToCloud);
    return () => registerCloudPushHandler(null);
  }, [isActive, pushToCloud, registerCloudPushHandler]);

  useGridPersistenceAdapter({
    key: companyId
      ? { companyId, kind: "warehouse_grid", id: activeWarehouseId ?? "default" }
      : null,
    dirtyVersion,
    getSnapshot: () => ({
      dirtyRowIds: [...dirtyRowsRef.current],
      pendingArchiveIds: [...pendingArchiveIdsRef.current],
    }),
    pushToCloud,
    enabled: isActive && canEdit,
    label: userCopy.warehouse.excelGrid.persistenceLabel,
    scheduleInEngine: false,
  });

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

    function cellFromPointerClamped(clientX: number, clientY: number): GridCellAddress | null {
      if (!bodyRef.current) return null;
      return resolvePointerCellClamped({
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

    function applyDragAtPointer(clientX: number, clientY: number) {
      if (isDraggingSelectionRef.current) {
        const cell = cellFromPointerClamped(clientX, clientY);
        if (!cell) return;
        setSelection((current) => {
          const next = dragSelection(current, cell);
          selectionRef.current = next;
          return next;
        });
        ensureExpanded(cell.row);
      }
      if (isDraggingFillRef.current && fillSourceRef.current) {
        const cell = cellFromPointerClamped(clientX, clientY);
        if (!cell) return;
        const source = fillSourceRef.current;
        const target = resolveFillDragTarget(source, cell);
        fillTargetRef.current = target;
        setFillPreview(target);
        ensureExpanded(target.maxRow);
      }
    }

    onDragAutoScrollTickRef.current = () => {
      applyDragAtPointer(lastDragPointerRef.current.x, lastDragPointerRef.current.y);
    };

    function onPointerMove(event: PointerEvent) {
      lastDragPointerRef.current = { x: event.clientX, y: event.clientY };
      if (pendingSelectionDragRef.current && !isDraggingSelectionRef.current) {
        const pending = pendingSelectionDragRef.current;
        const dx = Math.abs(event.clientX - pending.clientX);
        const dy = Math.abs(event.clientY - pending.clientY);
        if (dx > 4 || dy > 4) {
          isDraggingSelectionRef.current = true;
          if (!pending.target.hasPointerCapture(pending.pointerId)) {
            pending.target.setPointerCapture(pending.pointerId);
          }
        }
      }
      applyDragAtPointer(event.clientX, event.clientY);
    }

    function onPointerUp() {
      stopSelectionDrag();
      if (isDraggingFillRef.current && fillSourceRef.current && fillTargetRef.current) {
        if (canEdit) {
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
  }, [canEdit, ensureExpanded, layout.columns, layout.headerHeight, layout.rowHeight, layout.xOffsets, markDirty, rows]);

  useGridScrollWhileDrag({
    bodyRef,
    isDragging: () =>
      isDraggingSelectionRef.current ||
      isDraggingFillRef.current ||
      pendingSelectionDragRef.current != null,
    onAutoScrollTick: () => onDragAutoScrollTickRef.current(),
  });

  const closeContextMenu = useCallback(() => {
    setContextMenu(null);
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

  const commitEditor = useCallback((direction?: "down" | "up" | "left" | "right", valueOverride?: string) => {
    if (!editor) return;
    const { cell } = editor;
    const value = valueOverride ?? editor.value;
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

  const applyCellWrites = useCallback(
    (label: string, writes: Array<{ row: number; column: number; value: string }>) => {
      if (!canEdit || writes.length === 0) return;
      const mutations: GridMutation[] = [];
      setRows((current) => {
        const next = [...current];
        for (const write of writes) {
          if (!isEditableColumn(write.column)) continue;
          const rowRef = next[write.row];
          if (!rowRef) continue;
          const oldValue = valueAtCell(rowRef, write.column);
          if (oldValue === write.value) continue;
          next[write.row] = applyCellValue(rowRef, write.column, write.value);
          localSaveAckRef.current.delete(next[write.row].rowId);
          dirtyRowsRef.current.add(next[write.row].rowId);
          mutations.push({
            address: { row: write.row, column: write.column },
            oldValue,
            newValue: write.value,
          });
        }
        if (mutations.length > 0) {
          scheduleDirtyStatus();
        }
        return next;
      });
      commandBusRef.current.commit(label, mutations);
    },
    [canEdit, scheduleDirtyStatus],
  );

  const ensureRowCapacity = useCallback(
    (maxRowInclusive: number) => {
      if (maxRowInclusive < rows.length - 1) return;
      setRows((current) =>
        growWarehouseRows(
          current,
          maxRowInclusive - current.length + WAREHOUSE_GRID_EMPTY_ROWS_EXPAND + 1,
        ),
      );
    },
    [rows.length],
  );

  const scrollByPage = useCallback((direction: 1 | -1) => {
    if (!bodyRef.current) return;
    const delta = Math.max(40, bodyRef.current.clientHeight * 0.85);
    bodyRef.current.scrollTop += direction * delta;
  }, []);

  const valueAt = useCallback(
    (row: number, column: number) => valueAtCell(rows[row], column),
    [rows],
  );

  const {
    copySelection,
    cutSelection,
    pasteSelection,
    clearSelection,
    fillDown,
    handleKeyDown,
  } = useExcelGridInteraction({
    canEdit,
    isEditing: Boolean(editor),
    selection,
    selectionRef,
    setSelection,
    rowCount: rows.length,
    columnCount: layout.columns.length,
    editableColumnStart: WAREHOUSE_EDITABLE_COL_START,
    editableColumnEnd: WAREHOUSE_EDITABLE_COL_END,
    navigableColumns: NAVIGABLE_COLUMNS,
    valueAt,
    isEditableColumn,
    mapClearColumn: resolveWarehouseClearColumn,
    applyCellWrites,
    ensureRowCapacity,
    beginEdit,
    performUndo,
    performRedo,
    scrollByPage,
    cmdADoubleTapRef,
    onDomainKeyDown: (event) => {
      if (
        !event.metaKey &&
        !event.altKey &&
        !event.ctrlKey &&
        (event.key === "l" || event.key === "L") &&
        canEdit &&
        onAssignLocation
      ) {
        const selected = getContextSelectedItems(rowsRef.current, selectionRef.current);
        if (selected.length > 0) {
          event.preventDefault();
          onAssignLocation(selected);
          return true;
        }
      }
      return false;
    },
  });

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

          for (let column = WAREHOUSE_EDITABLE_COL_START; column <= WAREHOUSE_EDITABLE_COL_END; column += 1) {
            if (!isEditableColumn(column)) continue;
            const oldValue = valueAtCell(next[row], column);
            if (!oldValue.trim()) continue;
            next[row] = applyCellValue(next[row], column, "");
            mutations.push({
              address: { row, column },
              oldValue,
              newValue: "",
            });
          }
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
        data-context-menu-scope="local"
        className="relative min-h-0 flex-1 overflow-hidden outline-none"
        onKeyDown={handleKeyDown}
      >
        <div
          className="absolute inset-0 overflow-auto bg-background excel-grid-scroll"
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
            if (target instanceof Element && target.closest("[data-grid-editor-suggestions]")) return;
            if (target instanceof Node && gridRef.current?.contains(target)) return;
            endEdit();
          }}
        >
          <div
            className="relative bg-card shadow-[1px_0_0_0_var(--border)]"
            data-grid-canvas
            data-grid-density={layout.density.band}
            style={{
              width: layout.totalWidth,
              height: layout.headerHeight + rows.length * layout.rowHeight,
              fontSize: `${Math.max(11, Math.round(13 * gridZoom * layout.density.scale))}px`,
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
                      "absolute top-0 flex border-r px-2 font-semibold tracking-[0.01em] text-muted-foreground",
                      column.align === "center" ? "items-center justify-center" : "items-center justify-start",
                    )}
                    style={{
                      left: layout.xOffsets[colIdx],
                      width: column.width,
                      height: layout.headerHeight,
                      fontSize: `${gridHeaderFontSizePx(gridZoom, layout.density.scale)}px`,
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
              className="absolute left-0 right-0"
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
                      const isDirtyRow = dirtyRowIdsForUi.has(row.rowId);

                      return (
                        <div
                          key={`${row.rowId}-${column.id}`}
                          className={cn(
                            "absolute flex border-r border-b px-2 text-[13px] leading-5 whitespace-nowrap transition-[background-color,box-shadow] duration-150 ease-out motion-reduce:transition-none",
                            column.align === "center" ? "items-center justify-center" : "items-center justify-start",
                            outOfStock && "bg-destructive/18 text-destructive",
                            selected && !outOfStock && "bg-emerald-500/12",
                            focused && "z-[2] ring-2 ring-inset",
                            isDirtyRow && !outOfStock && !selected && "bg-amber-500/8",
                            saveFlashRows.has(row.rowId) && !outOfStock && "bg-emerald-400/20",
                            scanFlashRows.has(row.rowId) &&
                              !outOfStock &&
                              "bg-primary/12 ring-2 ring-inset ring-primary/40",
                            lowStock && (colIdx === 5 || colIdx === 7) && "text-amber-700 dark:text-amber-300",
                            colIdx === 6 && !outOfStock && "text-muted-foreground",
                            colIdx === 16 && "text-muted-foreground text-[11px]",
                          )}
                          style={{
                            left: cell.x,
                            top: cell.y,
                            width: cell.width,
                            height: cell.height,
                            ...(isDirtyRow && colIdx === 1
                              ? { boxShadow: "inset 3px 0 0 0 color-mix(in oklab, var(--color-amber-500) 70%, transparent)" }
                              : {}),
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
                                pointerId: event.pointerId,
                                target: event.currentTarget,
                              };
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
                              cell: clicked,
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
                                {userCopy.warehouse.excelGrid.sell}
                              </button>
                            ) : null
                          ) : colIdx === WAREHOUSE_PHOTO_COLUMN ? (
                            row.rowKind === "saved" && canEdit ? (
                              <GridPhotoCell
                                urls={row.imageUrls ?? []}
                                companyId={companyId}
                                entityKind="warehouse"
                                entityId={row.id}
                                onChange={(urls) => {
                                  markDirty(row.rowId);
                                  setRows((current) =>
                                    current.map((entry) =>
                                      entry.rowId === row.rowId && entry.rowKind === "saved"
                                        ? { ...entry, imageUrls: urls }
                                        : entry,
                                    ),
                                  );
                                }}
                              />
                            ) : row.rowKind === "empty" && canEdit && hasWarehouseDraftContent(row) ? (
                              <GridPhotoCell
                                urls={row.draft.imageUrls}
                                companyId={companyId}
                                entityKind="warehouse"
                                entityId={row.rowId}
                                onChange={(urls) => {
                                  markDirty(row.rowId);
                                  setRows((current) =>
                                    current.map((entry) =>
                                      entry.rowId === row.rowId
                                        ? applyWarehouseDraftImageUrls(entry, urls)
                                        : entry,
                                    ),
                                  );
                                }}
                              />
                            ) : (
                              <GridPhotoCellDisabledHint />
                            )
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
                <>
                  <div
                    aria-hidden
                    className="pointer-events-none absolute inset-0 z-20 bg-background/5"
                    style={{ top: layout.headerHeight }}
                  />
                  <GridEditorOverlay
                  editorKey={`${editor.cell.row}-${editor.cell.column}`}
                  value={editor.value}
                  selectAll={editor.selectAll}
                  frame={warehouseCellFrame(layout, editor.cell)}
                  onChange={(value) => setEditor((current) => (current ? { ...current, value } : current))}
                  onCommit={(direction, value) => commitEditor(direction, value)}
                  onCancel={endEdit}
                  autocompleteMatch={editorAutocompleteMatch}
                  columnSuggestions={editorSuggestionList}
                  domainCategory={layout.columns[editor.cell.column]?.domainCategory}
                  deferDictionaryWrites
                  onDeferredDictionaryEntry={queueDictionaryEntry}
                  onSuggestionsOpenChange={setSuggestionsOpen}
                  showSuggestionFooter
                />
                </>
              ) : null}
            </div>
          </div>
        </div>
        <GridZoomControl />
      </div>

      {contextMenu ? (
        <GridContextMenu x={contextMenu.x} y={contextMenu.y} onClose={closeContextMenu}>
          <GridContextMenuItem
            shortcut={modShortcutLabel("C")}
            onClick={() => {
              void copySelection();
              closeContextMenu();
            }}
          >
            {userCopy.warehouse.excelGrid.copy}
          </GridContextMenuItem>

          {canEdit ? (
            <>
              <GridContextMenuItem
                shortcut={modShortcutLabel("X")}
                onClick={() => {
                  void cutSelection();
                  closeContextMenu();
                }}
              >
                {userCopy.warehouse.excelGrid.cut}
              </GridContextMenuItem>
              <GridContextMenuItem
                shortcut={modShortcutLabel("V")}
                onClick={() => {
                  void pasteSelection();
                  closeContextMenu();
                }}
              >
                {userCopy.warehouse.excelGrid.paste}
              </GridContextMenuItem>
              <GridContextMenuItem
                shortcut={deleteShortcutLabel()}
                onClick={() => {
                  clearSelection();
                  closeContextMenu();
                }}
              >
                {userCopy.warehouse.excelGrid.clear}
              </GridContextMenuItem>
              <GridContextMenuItem
                shortcut={modShortcutLabel("D")}
                onClick={() => {
                  fillDown();
                  closeContextMenu();
                }}
              >
                {userCopy.warehouse.excelGrid.fillDown}
              </GridContextMenuItem>
              <GridContextMenuItem
                onClick={() => {
                  if (isEditableColumn(contextMenu.cell.column)) {
                    beginEdit(contextMenu.cell);
                  }
                  closeContextMenu();
                }}
                disabled={!isEditableColumn(contextMenu.cell.column)}
              >
                {userCopy.warehouse.excelGrid.edit}
              </GridContextMenuItem>
              <GridContextMenuSeparator />
              <GridContextMenuItem
                destructive
                onClick={() => {
                  deleteSelectedRows();
                  closeContextMenu();
                }}
              >
                {userCopy.warehouse.excelGrid.deleteRow}
              </GridContextMenuItem>
            </>
          ) : null}

          {contextMenu.selected.length > 0 ? (
            <>
              <GridContextMenuSeparator />
              <GridContextMenuItem
                icon={PackagePlus}
                onClick={() => {
                  const target = contextMenu.selected[0];
                  if (target) onReceipt(target);
                  closeContextMenu();
                }}
              >
                {userCopy.warehouse.excelGrid.receipt}
              </GridContextMenuItem>
              <GridContextMenuItem
                icon={SlidersHorizontal}
                onClick={() => {
                  const target = contextMenu.selected[0];
                  if (target) onAdjust(target);
                  closeContextMenu();
                }}
              >
                {userCopy.warehouse.excelGrid.adjustment}
              </GridContextMenuItem>
              <GridContextMenuItem
                onClick={() => {
                  const target = contextMenu.selected[0];
                  if (target) onTransfer(target);
                  closeContextMenu();
                }}
              >
                {userCopy.warehouse.excelGrid.transfer}
              </GridContextMenuItem>
              {canEdit && onAssignLocation ? (
                <GridContextMenuItem
                  icon={MapPin}
                  shortcut="L"
                  onClick={() => {
                    onAssignLocation(contextMenu.selected);
                    closeContextMenu();
                  }}
                >
                  {userCopy.warehouse.excelGrid.assignLocation}
                  {contextMenu.selected.length > 1
                    ? ` (${contextMenu.selected.length})`
                    : ""}
                </GridContextMenuItem>
              ) : null}
              <GridContextMenuItem
                onClick={() => {
                  const target = contextMenu.selected[0];
                  if (target) onHistory(target);
                  closeContextMenu();
                }}
              >
                {userCopy.warehouse.excelGrid.history}
              </GridContextMenuItem>
              {contextMenu.selected[0]?.sku.trim() ? (
                <GridContextMenuItem
                  onClick={() => {
                    void navigator.clipboard.writeText(contextMenu.selected[0]!.sku.trim());
                    closeContextMenu();
                  }}
                >
                  {userCopy.warehouse.excelGrid.copySku}
                </GridContextMenuItem>
              ) : null}
            </>
          ) : null}
        </GridContextMenu>
      ) : null}
    </div>
  );
}
