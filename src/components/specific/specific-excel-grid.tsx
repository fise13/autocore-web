"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import { deleteSpecificRecordUseCase } from "@/application/use-cases/specific/delete-specific-record";
import { assignAssetLocation } from "@/application/use-cases/warehouse/assign-asset-location";
import { SpecificColumnDef } from "@/domain/specific-category";
import { withSpecificLocationColumn, SPECIFIC_LOCATION_COLUMN_KEY } from "@/lib/specific/specific-location-column";
import { resolveSpecificRecordLocationLabel } from "@/lib/warehouse/resolve-item-location-label";
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
import { GridZoomControl } from "@/components/motors/grid-zoom-control";
import { useExcelGridInteraction } from "@/hooks/use-excel-grid-interaction";
import { buildFillOperations, resolveFillDragTarget } from "@/lib/grid/grid-fill-engine";
import { GridMutation, GridCommandBus } from "@/lib/grid/grid-command-bus";
import { deleteShortcutLabel, modShortcutLabel } from "@/lib/grid/grid-keyboard-shortcuts";
import { resolvePointerCellClamped } from "@/lib/grid/pointer-to-cell";
import { useGridScrollWhileDrag } from "@/lib/grid/grid-scroll-while-drag";
import { useGridScrollIntoView } from "@/lib/grid/scroll-into-view";
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
import { resolveGridColumnAutocomplete } from "@/lib/grid/grid-column-autocomplete";
import { gridPalette } from "@/lib/grid/grid-palette";
import {
  MOTOR_GRID_EMPTY_ROWS_EXPAND,
  MOTOR_GRID_EMPTY_ROWS_THRESHOLD,
} from "@/lib/motor-grid-layout";
import {
  applySpecificCellValue,
  buildSavedSpecificRowFromUpsert,
  buildSpecificGridRows,
  growSpecificRows,
  hasSpecificRowContent,
  reconcileSpecificRowsWithRemote,
  specificCellValue,
  SpecificGridRow,
} from "@/lib/specific/specific-grid-data-store";
import { scopedRecordDocumentId } from "@/lib/specific/specific-sync-ids";
import {
  buildSpecificMotorGridLayout,
  isSpecificSchemaColumnEditable,
  specificCellFrame,
  specificSchemaColumnAt,
} from "@/lib/specific/specific-grid-layout";
import {
  parseSpecificPhotoUrls,
  serializeSpecificPhotoUrls,
  SPECIFIC_PHOTO_URLS_KEY,
} from "@/lib/specific/specific-photo-quality";
import {
  buildRowPayloadFromSchema,
  resolveCategoryColumnSchema,
  schemaToHeaderMapping,
} from "@/lib/specific/specific-category-schema";
import {
  isSpecificRecordSold,
} from "@/lib/specific/specific-header-mapping";
import {
  filterSpecificRecords,
  filterSpecificRecordsByAvailability,
} from "@/lib/specific/specific-table";
import { MotorAvailability } from "@/infrastructure/firestore/motor-repository";
import {
  SpecificCategoryEntity,
  SpecificCategoryRepository,
  SpecificRecordEntity,
} from "@/infrastructure/firestore/specific-category-repository";
import { mapAuthError, userCopy } from "@/lib/user-copy";
import { cn } from "@/lib/utils";
import { getFirebaseAuth } from "@/infrastructure/firebase/client";

type SpecificExcelGridProps = {
  records: SpecificRecordEntity[];
  search?: string;
  category: SpecificCategoryEntity;
  columnSchema?: SpecificColumnDef[];
  companyId: string;
  canEdit: boolean;
  repository: SpecificCategoryRepository;
  availability?: MotorAvailability;
  soldOnly?: boolean;
  compactEmptyRows?: boolean;
  onSell?: (row: SpecificGridRow) => void;
  onUnsell?: (row: SpecificGridRow) => void;
  /** When false, keep local dirty rows but do not own the global save bar / Cmd+S handlers. */
  isActive?: boolean;
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
  selected: SpecificGridRow[];
};

function getContextSelectedRows(
  rows: SpecificGridRow[],
  selection: GridSelectionState,
): SpecificGridRow[] {
  const unique = new Map<string, SpecificGridRow>();
  for (const range of allRanges(selection)) {
    for (let row = range.minRow; row <= range.maxRow; row += 1) {
      const item = rows[row];
      if (!item || item.rowKind !== "saved") continue;
      unique.set(item.id, item);
    }
  }
  return [...unique.values()];
}

type DisplayRow = {
  sourceIndex: number;
  row: SpecificGridRow;
};

const EDITABLE_COL_START = 1;

function isDateColumn(
  column: number,
  layout: ReturnType<typeof buildSpecificMotorGridLayout>,
): boolean {
  const colDef = specificSchemaColumnAt(layout, column);
  if (!colDef) return false;
  if (colDef.kind === "canonical") {
    return colDef.slotIndex === 5 || colDef.slotIndex === 6;
  }
  return false;
}

function isInteractiveGridTarget(target: EventTarget | null): boolean {
  return target instanceof HTMLElement && Boolean(target.closest("button, a, input, textarea, select"));
}

export function SpecificExcelGrid({
  records,
  search,
  category,
  columnSchema: columnSchemaProp,
  companyId,
  canEdit,
  repository,
  availability = "all",
  soldOnly = false,
  compactEmptyRows = false,
  onSell,
  onUnsell,
  isActive: isActiveProp,
}: SpecificExcelGridProps) {
  const panelActive = usePanelActive();
  const isActive = isActiveProp ?? panelActive;
  const {
    setSaveStatus,
    setSaveError,
    registerSaveHandler,
    registerGridUndoHandler,
    registerGridRedoHandler,
    registerCloudPushHandler,
    registerSyncHandler,
    gridZoom,
  } = useWorkspace();

  const effectiveAvailability: MotorAvailability = soldOnly ? "sold" : availability;

  const scopedRecords = useMemo(() => {
    const searched = filterSpecificRecords(records, search ?? "");
    return filterSpecificRecordsByAvailability(
      searched,
      effectiveAvailability,
      schemaToHeaderMapping(columnSchemaProp ?? resolveCategoryColumnSchema(category, records)),
    );
  }, [category, columnSchemaProp, effectiveAvailability, records, search]);

  const columnSchema = useMemo(
    () => withSpecificLocationColumn(columnSchemaProp ?? resolveCategoryColumnSchema(category, scopedRecords)),
    [category, columnSchemaProp, scopedRecords],
  );

  const layout = useMemo(
    () => buildSpecificMotorGridLayout(columnSchema, gridZoom),
    [columnSchema, gridZoom],
  );
  const headerMapping = layout.mapping;
  const editableColEnd = layout.dataColumnCount;
  const actionColumn = layout.actionColumn;

  const [rows, setRows] = useState<SpecificGridRow[]>(() => buildSpecificGridRows(scopedRecords));
  const rowsRef = useRef(rows);
  useEffect(() => {
    rowsRef.current = rows;
  }, [rows]);
  const [dirtyVersion, setDirtyVersion] = useState(0);
  const [dirtyRowIdSet, setDirtyRowIdSet] = useState<Set<string>>(() => new Set());

  const isEditableColumn = useCallback(
    (column: number) => isSpecificSchemaColumnEditable(layout, column),
    [layout],
  );

  const navigableColumns = useMemo(
    () =>
      Array.from({ length: Math.max(0, editableColEnd) }, (_, index) => index + EDITABLE_COL_START),
    [editableColEnd],
  );

  const valueAtCell = useCallback(
    (row: SpecificGridRow, column: number) =>
      specificCellValue(row, column, headerMapping, columnSchema),
    [columnSchema, headerMapping],
  );

  const applyCellValue = useCallback(
    (row: SpecificGridRow, column: number, value: string) =>
      applySpecificCellValue(row, column, value, headerMapping, columnSchema),
    [columnSchema, headerMapping],
  );

  const gridRef = useRef<HTMLDivElement>(null);
  const bodyRef = useRef<HTMLDivElement>(null);
  const commandBusRef = useRef(new GridCommandBus());
  const recordsRef = useRef(records);
  const dirtyRowsRef = useRef<Set<string>>(new Set());
  const pendingDeleteIdsRef = useRef<Set<string>>(new Set());
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
  const lastDragPointerRef = useRef({ x: 0, y: 0 });
  const onDragAutoScrollTickRef = useRef<() => void>(() => {});
  const applyCellWritesRef = useRef<
    (label: string, writes: Array<{ row: number; column: number; value: string }>) => void
  >(() => {});

  const [selection, setSelection] = useState<GridSelectionState>(initialSelection);
  const selectionRef = useRef(selection);
  useEffect(() => {
    selectionRef.current = selection;
  }, [selection]);
  const [editor, setEditor] = useState<EditorState | null>(null);
  const editorRef = useRef<EditorState | null>(null);
  editorRef.current = editor;
  const [scroll, setScroll] = useState({ top: 0, left: 0, width: 0, height: 0 });
  const [fillPreview, setFillPreview] = useState<GridRange | null>(null);
  const [contextMenu, setContextMenu] = useState<ContextMenuState | null>(null);
  const [activeActionLabel, setActiveActionLabel] = useState<string | null>(null);
  const [saveFlashRows, setSaveFlashRows] = useState<Set<string>>(new Set());

  const visibleRecords = useMemo(() => scopedRecords, [scopedRecords]);
  const visibleRecordIds = useMemo(
    () => new Set(visibleRecords.map((record) => record.id)),
    [visibleRecords],
  );

  const displayRows = useMemo((): DisplayRow[] => {
    const hasSearch = Boolean(search?.trim());
    const mapped = rows.map((row, sourceIndex) => ({ sourceIndex, row }));
    const filtered = mapped.filter(({ row }) => {
      if (row.rowKind === "saved") {
        const sold = isSpecificRecordSold(row, headerMapping);
        if (effectiveAvailability === "sold" && !sold) return false;
        if (effectiveAvailability === "available" && sold) return false;
        if (soldOnly && !sold) return false;
        if (hasSearch && !visibleRecordIds.has(row.id)) return false;
        return true;
      }
      if (soldOnly || compactEmptyRows) {
        return dirtyRowIdSet.has(row.rowId);
      }
      if (!hasSearch) return true;
      return dirtyRowIdSet.has(row.rowId);
    });
    return filtered;
  }, [
    compactEmptyRows,
    dirtyRowIdSet,
    effectiveAvailability,
    headerMapping,
    rows,
    search,
    soldOnly,
    visibleRecordIds,
  ]);

  useEffect(() => {
    recordsRef.current = scopedRecords;
    setRows((current) =>
      reconcileSpecificRowsWithRemote(current, scopedRecords, dirtyRowsRef.current),
    );
  }, [scopedRecords]);

  useEffect(() => {
    if (!isActive) return;
    const dirtyIds = dirtyRowsRef.current;
    if (dirtyIds.size === 0 && pendingDeleteIdsRef.current.size === 0) {
      setSaveStatus("idle");
      return;
    }
    const hasUnsavedLocal =
      pendingDeleteIdsRef.current.size > 0 ||
      [...dirtyIds].some((rowId) => !localSaveAckRef.current.has(rowId));
    setSaveStatus(hasUnsavedLocal ? "pending" : "saved");
  }, [dirtyVersion, isActive, setSaveStatus]);

  const columnWidths = useMemo(() => layout.columns.map((column) => column.width), [layout.columns]);

  const visible = useMemo(() => {
    const viewportHeight = scroll.height > 0 ? scroll.height : 640;
    const viewportWidth = scroll.width > 0 ? scroll.width : 960;

    const rowStart = Math.max(0, Math.floor(scroll.top / layout.rowHeight) - 2);
    const rowEnd = Math.min(
      displayRows.length - 1,
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
  }, [
    columnWidths,
    displayRows.length,
    layout.rowHeight,
    scroll.height,
    scroll.left,
    scroll.top,
    scroll.width,
  ]);

  const isDateColumnAt = useCallback(
    (column: number) => isDateColumn(column, layout),
    [layout],
  );

  const editorAutocompleteMatch = useMemo(
    () =>
      resolveGridColumnAutocomplete(
        editor,
        rows.length,
        (row, column) => valueAtCell(rows[row], column),
        (column) => isEditableColumn(column) && !isDateColumnAt(column),
      ),
    [editor, isDateColumnAt, isEditableColumn, rows, valueAtCell],
  );

  const scheduleDirtyStatus = useCallback(() => {
    if (dirtyStatusScheduledRef.current) return;
    dirtyStatusScheduledRef.current = true;
    queueMicrotask(() => {
      dirtyStatusScheduledRef.current = false;
      setDirtyRowIdSet(new Set(dirtyRowsRef.current));
      setDirtyVersion((current) => current + 1);
    });
  }, []);

  const markDirty = useCallback((rowId: string) => {
    const wasAcknowledged = localSaveAckRef.current.delete(rowId);
    if (!dirtyRowsRef.current.has(rowId)) {
      dirtyRowsRef.current.add(rowId);
      scheduleDirtyStatus();
    } else if (wasAcknowledged) {
      scheduleDirtyStatus();
    }
  }, [scheduleDirtyStatus]);

  const handleSellAction = useCallback(
    (row: SpecificGridRow) => {
      if (row.rowKind !== "saved") return;
      const sold = isSpecificRecordSold(row, headerMapping);
      if (sold) {
        onUnsell?.(row);
        return;
      }
      onSell?.(row);
    },
    [headerMapping, onSell, onUnsell],
  );

  const closeContextMenu = useCallback(() => {
    setContextMenu(null);
  }, []);

  const setCell = useCallback(
    (cell: GridCellAddress, newValue: string, options?: { trackUndo?: boolean; markDirty?: boolean }) => {
      const applyToRows = (current: SpecificGridRow[]) => {
        const row = current[cell.row];
        if (!row || !isEditableColumn(cell.column)) return current;
        const oldValue = valueAtCell(row, cell.column);
        if (oldValue === newValue) return current;
        const next = [...current];
        const updatedRow = applyCellValue(row, cell.column, newValue);
        next[cell.row] = updatedRow;
        if (options?.trackUndo !== false) {
          commandBusRef.current.commit("Edit Cell", [{ address: cell, oldValue, newValue }]);
        }
        if (options?.markDirty !== false) {
          markDirty(updatedRow.rowId);
        }
        return next;
      };

      const nextRows = applyToRows(rowsRef.current);
      if (nextRows === rowsRef.current) return;
      rowsRef.current = nextRows;
      setRows(nextRows);
    },
    [applyCellValue, isEditableColumn, markDirty, valueAtCell],
  );

  const applyMutation = useCallback(
    (mutation: GridMutation, reverse: boolean) => {
      setCell(mutation.address, reverse ? mutation.oldValue : mutation.newValue, {
        trackUndo: false,
        markDirty: true,
      });
    },
    [setCell],
  );

  const performUndo = useCallback(() => {
    if (!canEdit) return;
    const label = handleGridUndo(commandBusRef.current, applyMutation, editor, setEditor);
    setActiveActionLabel(label);
    queueMicrotask(() => {
      setRows((current) => {
        for (const recordId of [...pendingDeleteIdsRef.current]) {
          const row = current.find(
            (candidate) => candidate.rowKind === "saved" && candidate.id === recordId,
          );
          if (row && hasSpecificRowContent(row, headerMapping, columnSchema)) {
            pendingDeleteIdsRef.current.delete(recordId);
          }
        }
        scheduleDirtyStatus();
        return current;
      });
    });
    gridRef.current?.focus();
  }, [applyMutation, canEdit, columnSchema, editor, headerMapping, scheduleDirtyStatus]);

  const performRedo = useCallback(() => {
    if (!canEdit) return;
    const label = handleGridRedo(commandBusRef.current, applyMutation);
    setActiveActionLabel(label);
    queueMicrotask(() => {
      setRows((current) => {
        for (const recordId of [...pendingDeleteIdsRef.current]) {
          const row = current.find(
            (candidate) => candidate.rowKind === "saved" && candidate.id === recordId,
          );
          if (row && hasSpecificRowContent(row, headerMapping, columnSchema)) {
            pendingDeleteIdsRef.current.delete(recordId);
          }
        }
        scheduleDirtyStatus();
        return current;
      });
    });
    gridRef.current?.focus();
  }, [applyMutation, canEdit, columnSchema, headerMapping, scheduleDirtyStatus]);

  const ensureExpanded = useCallback(
    (lastVisibleDisplayRow: number) => {
      if (compactEmptyRows) return;
      setRows((current) => {
        const distance = displayRows.length - lastVisibleDisplayRow - 1;
        if (distance > MOTOR_GRID_EMPTY_ROWS_THRESHOLD) return current;
        return growSpecificRows(current, MOTOR_GRID_EMPTY_ROWS_EXPAND);
      });
    },
    [compactEmptyRows, displayRows.length],
  );

  const saveLocalOnly = useCallback(() => {
    if (dirtyRowsRef.current.size === 0) {
      setSaveStatus("idle");
      return;
    }
    for (const rowId of dirtyRowsRef.current) {
      localSaveAckRef.current.add(rowId);
    }
    setSaveError(null);
    setSaveStatus("saved");
    setDirtyVersion((current) => current + 1);
    window.setTimeout(() => setSaveStatus("idle"), 1200);
  }, [setSaveError, setSaveStatus]);

  const flushEditor = useCallback(() => {
    const currentEditor = editorRef.current;
    if (!currentEditor) return;
    setCell(currentEditor.cell, currentEditor.value);
    setEditor(null);
  }, [setCell]);

  const runSave = useCallback(() => {
    flushEditor();
    saveLocalOnly();
  }, [flushEditor, saveLocalOnly]);

  const pushToCloud = useCallback(async () => {
    flushEditor();
    if (!companyId || !canEdit) return;
    if (dirtyRowsRef.current.size === 0 && pendingDeleteIdsRef.current.size === 0) {
      setSaveStatus("idle");
      return;
    }

    setSaveStatus("saving");
    setSaveError(null);

    try {
      const actorUid = getFirebaseAuth().currentUser?.uid;
      if (!actorUid) throw new Error(userCopy.specificSheets.grid.authRequired);

      const pendingDeletes = [...pendingDeleteIdsRef.current];
      if (pendingDeletes.length > 0) {
        for (const recordId of pendingDeletes) {
          await deleteSpecificRecordUseCase(repository, {
            recordId,
            companyId,
            actorUid,
          });
          dirtyRowsRef.current.delete(`saved-${recordId}`);
        }
        pendingDeleteIdsRef.current.clear();
        const nextRows = rowsRef.current.filter(
          (row) => row.rowKind !== "saved" || !pendingDeletes.includes(row.id),
        );
        rowsRef.current = nextRows;
        setRows(nextRows);
      }

      // rowsRef is updated synchronously by setCell/flushEditor — never use stale React state here.
      const snapshotRows = rowsRef.current;
      const baselineById = new Map(recordsRef.current.map((record) => [record.id, record]));
      const rowReplacements = new Map<string, SpecificGridRow>();
      const dirtyRowIds = [...dirtyRowsRef.current];
      const resolvedDirtyIds = new Set<string>();

      for (const rowId of dirtyRowIds) {
        const row = snapshotRows.find((item) => item.rowId === rowId);
        if (!row) continue;
        if (row.rowKind === "saved" && pendingDeletes.includes(row.id)) continue;
        if (row.rowKind === "empty" && !hasSpecificRowContent(row, headerMapping, columnSchema)) {
          resolvedDirtyIds.add(rowId);
          continue;
        }

        if (row.rowKind === "saved") {
          const baseline = baselineById.get(row.id);
          const changed =
            !baseline ||
            JSON.stringify(buildRowPayloadFromSchema(row.data, columnSchema)) !==
              JSON.stringify(buildRowPayloadFromSchema(baseline.data, columnSchema));
          if (!changed) {
            resolvedDirtyIds.add(rowId);
            continue;
          }
        }

        await (async () => {
          const payload = buildRowPayloadFromSchema(row.data, columnSchema);
          const locationText =
            payload[SPECIFIC_LOCATION_COLUMN_KEY]?.trim() ||
            resolveSpecificRecordLocationLabel({
              ...row,
              data: payload,
            });
          const assigned = locationText
            ? await assignAssetLocation({
                companyId,
                locationText,
                actorUserId: actorUid,
              })
            : null;
          if (assigned) {
            payload[SPECIFIC_LOCATION_COLUMN_KEY] = assigned.primaryLocationCode;
          } else {
            delete payload[SPECIFIC_LOCATION_COLUMN_KEY];
          }
          await repository.upsertRecord(
            companyId,
            category,
            row.rowIndex,
            payload,
            actorUid,
            {
              warehouseLocation: assigned?.warehouseLocation ?? null,
              primaryLocationId: assigned?.primaryLocationId ?? null,
              primaryLocationCode: assigned?.primaryLocationCode ?? null,
            },
          );
        })();

        resolvedDirtyIds.add(rowId);
        if (row.rowKind === "empty") {
          const recordId = scopedRecordDocumentId(companyId, category.localId, row.rowIndex);
          rowReplacements.set(
            rowId,
            buildSavedSpecificRowFromUpsert(
              row,
              recordId,
              companyId,
              category.id,
              category.localId,
            ),
          );
        }
      }

      if (rowReplacements.size > 0) {
        const nextRows = rowsRef.current.map(
          (currentRow) => rowReplacements.get(currentRow.rowId) ?? currentRow,
        );
        rowsRef.current = nextRows;
        setRows(nextRows);
      }

      const pushedRowIds = [...resolvedDirtyIds].map(
        (rowId) => rowReplacements.get(rowId)?.rowId ?? rowId,
      );
      for (const rowId of resolvedDirtyIds) {
        dirtyRowsRef.current.delete(rowId);
        localSaveAckRef.current.delete(rowId);
      }
      setDirtyRowIdSet(new Set(dirtyRowsRef.current));
      setDirtyVersion((current) => current + 1);
      setSaveStatus("saved");
      if (pushedRowIds.length > 0 || pendingDeletes.length > 0) {
        setSaveFlashRows(new Set(pushedRowIds));
        window.setTimeout(() => setSaveFlashRows(new Set()), 450);
      }
      window.setTimeout(() => setSaveStatus("idle"), 1200);
    } catch (error) {
      setSaveStatus("error");
      const message = mapAuthError(error);
      setSaveError(message);
      throw new Error(message);
    }
  }, [
    canEdit,
    category,
    columnSchema,
    companyId,
    flushEditor,
    headerMapping,
    repository,
    setSaveError,
    setSaveStatus,
  ]);

  const syncNow = useCallback(async () => {
    runSave();
    await pushToCloud();
  }, [pushToCloud, runSave]);

  useEffect(() => {
    if (!isActive) return;
    registerSaveHandler(runSave);
    return () => registerSaveHandler(null);
  }, [isActive, registerSaveHandler, runSave]);

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

  useEffect(() => {
    if (!isActive) return;
    registerSyncHandler(syncNow);
    return () => registerSyncHandler(null);
  }, [isActive, registerSyncHandler, syncNow]);

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
        rowCount: displayRows.length,
        rowHeight: layout.rowHeight,
        headerHeight: layout.headerHeight,
        columns: layout.columns,
        xOffsets: layout.xOffsets,
        mapRow: (displayRow) => displayRows[displayRow]?.sourceIndex ?? null,
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
        const displayIndex = displayRows.findIndex((item) => item.sourceIndex === cell.row);
        if (displayIndex >= 0) ensureExpanded(displayIndex);
      }
      if (isDraggingFillRef.current && fillSourceRef.current) {
        const cell = cellFromPointerClamped(clientX, clientY);
        if (!cell) return;
        const source = fillSourceRef.current;
        const target = resolveFillDragTarget(source, cell);
        fillTargetRef.current = target;
        setFillPreview(target);
        const displayIndex = displayRows.findIndex((item) => item.sourceIndex === target.maxRow);
        if (displayIndex >= 0) ensureExpanded(displayIndex);
      }
    }

    onDragAutoScrollTickRef.current = () => {
      applyDragAtPointer(lastDragPointerRef.current.x, lastDragPointerRef.current.y);
    };

    function onPointerMove(event: PointerEvent) {
      lastDragPointerRef.current = { x: event.clientX, y: event.clientY };
      if (pendingSelectionDragRef.current && !isDraggingSelectionRef.current) {
        const dx = Math.abs(event.clientX - pendingSelectionDragRef.current.clientX);
        const dy = Math.abs(event.clientY - pendingSelectionDragRef.current.clientY);
        if (dx > 4 || dy > 4) {
          isDraggingSelectionRef.current = true;
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
            isDateColumn: isDateColumnAt,
          });
          applyCellWritesRef.current(
            "Fill Series",
            ops.map((operation) => ({
              row: operation.cell.row,
              column: operation.cell.column,
              value: operation.value,
            })),
          );
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
  }, [
    canEdit,
    displayRows,
    ensureExpanded,
    isDateColumnAt,
    isEditableColumn,
    layout.columns,
    layout.headerHeight,
    layout.rowHeight,
    layout.xOffsets,
    rows,
    valueAtCell,
  ]);

  useGridScrollWhileDrag({
    bodyRef,
    isDragging: () =>
      isDraggingSelectionRef.current ||
      isDraggingFillRef.current ||
      pendingSelectionDragRef.current != null,
    onAutoScrollTick: () => onDragAutoScrollTickRef.current(),
  });

  const resolveScrollFrame = useCallback(
    (cell: GridCellAddress) => {
      const displayIndex = displayRows.findIndex((item) => item.sourceIndex === cell.row);
      if (displayIndex < 0) return null;
      return specificCellFrame(layout, { row: displayIndex, column: cell.column });
    },
    [displayRows, layout],
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

  const beginEdit = useCallback(
    (cell: GridCellAddress, seed?: string, selectAll = true) => {
      if (!isEditableColumn(cell.column)) return;
      const row = rows[cell.row];
      if (!row || !canEdit) return;
      const value = seed ?? valueAtCell(row, cell.column);
      setEditor({ cell, value, initialValue: value, selectAll });
      scrollToCell(cell);
    },
    [canEdit, isEditableColumn, rows, scrollToCell, valueAtCell],
  );

  const commitEditor = useCallback(
    (direction?: "down" | "up" | "left" | "right") => {
      if (!editor) return;
      const { cell, value } = editor;
      setCell(cell, value);
      setEditor(null);
      if (!direction) {
        focusGrid();
        return;
      }
      const next = { ...cell };
      if (direction === "down") next.row += 1;
      if (direction === "up") next.row = Math.max(0, next.row - 1);
      if (direction === "right") next.column = Math.min(editableColEnd, next.column + 1);
      if (direction === "left") next.column = Math.max(EDITABLE_COL_START, next.column - 1);
      next.column = Math.max(EDITABLE_COL_START, Math.min(editableColEnd, next.column));
      if (next.row >= rows.length) {
        setRows((current) => growSpecificRows(current, MOTOR_GRID_EMPTY_ROWS_EXPAND));
      }
      setSelection({
        anchor: next,
        head: next,
        cmdRanges: [],
      });
      scrollToCell(next);
      focusGrid();
    },
    [editor, editableColEnd, focusGrid, rows.length, scrollToCell, setCell],
  );

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
    [applyCellValue, canEdit, isEditableColumn, scheduleDirtyStatus, valueAtCell],
  );
  applyCellWritesRef.current = applyCellWrites;

  const ensureRowCapacity = useCallback(
    (maxRowInclusive: number) => {
      if (maxRowInclusive < rows.length - 1) return;
      setRows((current) =>
        growSpecificRows(
          current,
          maxRowInclusive - current.length + MOTOR_GRID_EMPTY_ROWS_EXPAND + 1,
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
    [rows, valueAtCell],
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
    editableColumnStart: EDITABLE_COL_START,
    editableColumnEnd: editableColEnd,
    navigableColumns,
    valueAt,
    isEditableColumn,
    applyCellWrites,
    ensureRowCapacity,
    beginEdit,
    performUndo,
    performRedo,
    scrollByPage,
    cmdADoubleTapRef,
  });

  const handleDeleteRow = useCallback(
    (row: SpecificGridRow) => {
      if (!canEdit || row.rowKind !== "saved") return;
      const rowIndex = rows.findIndex((item) => item.rowId === row.rowId);
      if (rowIndex < 0) return;

      const writes: Array<{ row: number; column: number; value: string }> = [];
      for (let column = EDITABLE_COL_START; column <= editableColEnd; column += 1) {
        if (!isEditableColumn(column)) continue;
        const currentValue = valueAtCell(row, column);
        if (currentValue) {
          writes.push({ row: rowIndex, column, value: "" });
        }
      }
      if (writes.length > 0) {
        applyCellWrites("Delete Row", writes);
      }
      pendingDeleteIdsRef.current.add(row.id);
      scheduleDirtyStatus();
    },
    [applyCellWrites, canEdit, editableColEnd, isEditableColumn, rows, scheduleDirtyStatus, valueAtCell],
  );


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
  }, [displayRows.length]);

  const primary = primaryRange(selection);
  const fillHandleCell: GridCellAddress | null = useMemo(() => {
    const col = Math.min(primary.maxColumn, editableColEnd);
    if (!isEditableColumn(col)) return null;
    return { row: primary.maxRow, column: col };
  }, [editableColEnd, isEditableColumn, primary.maxColumn, primary.maxRow]);

  const sourceIndexToDisplayIndex = useMemo(() => {
    const map = new Map<number, number>();
    displayRows.forEach((item, displayIndex) => {
      map.set(item.sourceIndex, displayIndex);
    });
    return map;
  }, [displayRows]);

  const fillPreviewFrame = useMemo(() => {
    if (!fillPreview) return null;
    const minDisplay = sourceIndexToDisplayIndex.get(fillPreview.minRow);
    const maxDisplay = sourceIndexToDisplayIndex.get(fillPreview.maxRow);
    if (minDisplay == null || maxDisplay == null) return null;
    return {
      left: layout.xOffsets[fillPreview.minColumn],
      top: minDisplay * layout.rowHeight,
      width:
        layout.xOffsets[fillPreview.maxColumn] +
        layout.columns[fillPreview.maxColumn].width -
        layout.xOffsets[fillPreview.minColumn],
      height: (maxDisplay - minDisplay + 1) * layout.rowHeight,
    };
  }, [fillPreview, layout, sourceIndexToDisplayIndex]);

  const fillHandleDisplayIndex = useMemo(() => {
    if (!fillHandleCell) return null;
    return sourceIndexToDisplayIndex.get(fillHandleCell.row) ?? null;
  }, [fillHandleCell, sourceIndexToDisplayIndex]);

  const editorDisplayIndex = useMemo(() => {
    if (!editor) return null;
    return sourceIndexToDisplayIndex.get(editor.cell.row) ?? null;
  }, [editor, sourceIndexToDisplayIndex]);

  const handleFillPointerDown = useCallback(
    (event: React.PointerEvent) => {
      event.stopPropagation();
      isDraggingFillRef.current = true;
      fillSourceRef.current = primaryRange(selection);
      fillTargetRef.current = primaryRange(selection);
      setFillPreview(primaryRange(selection));
    },
    [selection],
  );

  const handleFillDoubleClick = useCallback(() => {
    if (!canEdit) return;
    const source = primaryRange(selection);
    const lastDataRow = rows.reduce((acc, row, index) => {
      return hasSpecificRowContent(row, headerMapping, columnSchema) ? index : acc;
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
      isDateColumn: isDateColumnAt,
    });
    applyCellWrites(
      "Fill Series",
      ops.map((operation) => ({
        row: operation.cell.row,
        column: operation.cell.column,
        value: operation.value,
      })),
    );
  }, [
    applyCellWrites,
    canEdit,
    columnSchema,
    headerMapping,
    isDateColumnAt,
    isEditableColumn,
    rows,
    selection,
    valueAtCell,
  ]);

  return (
    <div className="animate-autocore-grid-enter relative flex h-full min-h-0 flex-col bg-card">
      {activeActionLabel ? (
        <div className="pointer-events-none absolute right-14 top-2 z-20 text-xs text-muted-foreground">
          {activeActionLabel}
        </div>
      ) : null}

      <div
        ref={gridRef}
        tabIndex={0}
        data-grid-root
        data-context-menu-scope="local"
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
            ensureExpanded(
              Math.floor((target.scrollTop + target.clientHeight) / layout.rowHeight),
            );
          }}
          onMouseDown={(event) => {
            if (editor) {
              const target = event.target;
              if (
                target instanceof Element &&
                target.closest("[data-grid-editor-suggestions]")
              ) {
                return;
              }
              setEditor(null);
            }
          }}
        >
          <div
            className="relative"
            style={{
              width: layout.totalWidth,
              height: layout.headerHeight + displayRows.length * layout.rowHeight,
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
                      column.align === "center"
                        ? "items-center justify-center"
                        : "items-center justify-start",
                      colIdx > 0 && canEdit && "hover:bg-muted/60",
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
              className="absolute left-0 right-0"
              style={{ top: layout.headerHeight }}
            >
              {Array.from({ length: visible.rowEnd - visible.rowStart + 1 }, (_, offset) => {
                const displayIndex = visible.rowStart + offset;
                const displayRow = displayRows[displayIndex];
                if (!displayRow) return null;
                const { sourceIndex: rowIdx, row } = displayRow;

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
                      const focused =
                        selection.head.row === rowIdx && selection.head.column === colIdx;
                      const cell = specificCellFrame(layout, {
                        row: displayIndex,
                        column: colIdx,
                      });
                      const displayValue = valueAtCell(row, colIdx);
                      const sold =
                        row.rowKind === "saved" && isSpecificRecordSold(row, headerMapping);

                      return (
                        <div
                          key={`${row.rowId}-${column.id}`}
                          className={cn(
                            "absolute flex border-r border-b px-2 text-[13px] leading-5 whitespace-nowrap transition-[background-color,box-shadow] duration-150 ease-out motion-reduce:transition-none",
                            column.align === "center"
                              ? "items-center justify-center"
                              : "items-center justify-start",
                            selected && "bg-emerald-500/12",
                            focused && "z-[2] ring-2 ring-inset",
                            saveFlashRows.has(row.rowId) && "bg-emerald-400/20",
                          )}
                          style={{
                            left: cell.x,
                            top: cell.y,
                            width: cell.width,
                            height: cell.height,
                            ...(selected ? { backgroundColor: gridPalette.selectionFill } : {}),
                            ...(focused
                              ? { boxShadow: `inset 0 0 0 2px ${gridPalette.activeBorder}` }
                              : {}),
                          }}
                          onPointerDown={(event) => {
                            if (isInteractiveGridTarget(event.target)) return;
                            event.preventDefault();
                            gridRef.current?.focus();
                            if (colIdx === 0) {
                              setSelection(
                                selectWholeRowActiveStart(rowIdx, EDITABLE_COL_START, editableColEnd),
                              );
                              return;
                            }
                            const next = clickSelection(
                              selectionRef.current,
                              { row: rowIdx, column: colIdx },
                              {
                                shift: event.shiftKey,
                                meta: event.metaKey || event.ctrlKey,
                              },
                            );
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
                              : selectWholeRow(rowIdx, EDITABLE_COL_START, editableColEnd);
                            if (nextSelection !== selection) {
                              setSelection(nextSelection);
                            }
                            setContextMenu({
                              x: event.clientX,
                              y: event.clientY,
                              cell: clicked,
                              selected: getContextSelectedRows(rows, nextSelection),
                            });
                          }}
                        >
                          {colIdx === actionColumn ? (
                            row.rowKind === "saved" &&
                            hasSpecificRowContent(row, headerMapping, columnSchema) &&
                            canEdit ? (
                              <button
                                type="button"
                                className={cn(
                                  "rounded border px-2 py-0.5 text-[11px]",
                                  sold
                                    ? "border-amber-500/30 bg-amber-500/10 text-amber-700"
                                    : "border-emerald-500/30 bg-emerald-500/10 text-emerald-700",
                                )}
                                onPointerDown={(event) => event.stopPropagation()}
                                onClick={(event) => {
                                  event.stopPropagation();
                                  handleSellAction(row);
                                }}
                              >
                                {sold ? userCopy.specificSheets.grid.unsell : userCopy.specificSheets.grid.sell}
                              </button>
                            ) : null
                          ) : column.cellKind === "photo" ? (
                            row.rowKind === "saved" && canEdit ? (
                              <GridPhotoCell
                                urls={parseSpecificPhotoUrls(row.data[SPECIFIC_PHOTO_URLS_KEY])}
                                companyId={companyId}
                                entityKind="specific"
                                entityId={row.id}
                                onChange={(urls) => {
                                  markDirty(row.rowId);
                                  setRows((current) =>
                                    current.map((entry) =>
                                      entry.rowId === row.rowId
                                        ? {
                                            ...entry,
                                            data: {
                                              ...entry.data,
                                              [SPECIFIC_PHOTO_URLS_KEY]: serializeSpecificPhotoUrls(urls),
                                            },
                                          }
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
                const minDisplay = sourceIndexToDisplayIndex.get(range.minRow);
                const maxDisplay = sourceIndexToDisplayIndex.get(range.maxRow);
                if (minDisplay == null || maxDisplay == null) return null;
                const left = layout.xOffsets[range.minColumn];
                const right =
                  layout.xOffsets[range.maxColumn] + layout.columns[range.maxColumn].width;
                const top = minDisplay * layout.rowHeight;
                const height = (maxDisplay - minDisplay + 1) * layout.rowHeight;
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

              {fillPreviewFrame ? (
                <div
                  className="pointer-events-none absolute animate-autocore-fade-in border-2 border-dashed opacity-80 transition-opacity duration-200 motion-reduce:transition-none"
                  style={{
                    left: fillPreviewFrame.left,
                    top: fillPreviewFrame.top,
                    width: fillPreviewFrame.width,
                    height: fillPreviewFrame.height,
                    borderColor: gridPalette.activeBorder,
                  }}
                />
              ) : null}

              {fillHandleCell && fillHandleDisplayIndex != null ? (
                <GridFillHandle
                  x={
                    layout.xOffsets[fillHandleCell.column] +
                    layout.columns[fillHandleCell.column].width -
                    7
                  }
                  y={fillHandleDisplayIndex * layout.rowHeight + layout.rowHeight - 7}
                  onPointerDown={handleFillPointerDown}
                  onDoubleClick={handleFillDoubleClick}
                />
              ) : null}

              {editor && editorDisplayIndex != null ? (
                <GridEditorOverlay
                  editorKey={`${editor.cell.row}-${editor.cell.column}`}
                  value={editor.value}
                  selectAll={editor.selectAll}
                  frame={specificCellFrame(layout, {
                    row: editorDisplayIndex,
                    column: editor.cell.column,
                  })}
                  onChange={(value) =>
                    setEditor((current) => (current ? { ...current, value } : current))
                  }
                  onCommit={(direction) => commitEditor(direction)}
                  onCancel={() => {
                    setEditor(null);
                    focusGrid();
                  }}
                  autocompleteMatch={editorAutocompleteMatch}
                />
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
            {userCopy.specificSheets.grid.copy}
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
                {userCopy.specificSheets.grid.cut}
              </GridContextMenuItem>
              <GridContextMenuItem
                shortcut={modShortcutLabel("V")}
                onClick={() => {
                  void pasteSelection();
                  closeContextMenu();
                }}
              >
                {userCopy.specificSheets.grid.paste}
              </GridContextMenuItem>
              <GridContextMenuItem
                shortcut={deleteShortcutLabel()}
                onClick={() => {
                  clearSelection();
                  closeContextMenu();
                }}
              >
                {userCopy.specificSheets.grid.clear}
              </GridContextMenuItem>
              <GridContextMenuItem
                shortcut={modShortcutLabel("D")}
                onClick={() => {
                  fillDown();
                  closeContextMenu();
                }}
              >
                {userCopy.specificSheets.grid.fillDown}
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
                {userCopy.specificSheets.grid.edit}
              </GridContextMenuItem>
            </>
          ) : null}

          {contextMenu.selected.length === 1 &&
          hasSpecificRowContent(contextMenu.selected[0]!, headerMapping, columnSchema) &&
          canEdit ? (
            <>
              <GridContextMenuSeparator />
              <GridContextMenuItem
                onClick={() => {
                  handleSellAction(contextMenu.selected[0]!);
                  closeContextMenu();
                }}
              >
                {isSpecificRecordSold(contextMenu.selected[0]!, headerMapping)
                  ? userCopy.specificSheets.grid.returnToStock
                  : userCopy.specificSheets.grid.sell}
              </GridContextMenuItem>
              <GridContextMenuItem
                onClick={() => {
                  handleDeleteRow(contextMenu.selected[0]!);
                  closeContextMenu();
                }}
              >
                {userCopy.specificSheets.grid.deleteRow}
              </GridContextMenuItem>
            </>
          ) : null}
        </GridContextMenu>
      ) : null}
    </div>
  );
}
