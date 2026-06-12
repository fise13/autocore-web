"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import { useGridEnterMotion } from "@/hooks/use-grid-enter-motion";
import { createMotorUseCase } from "@/application/use-cases/create-motor";
import { syncMotorCatalogUseCase } from "@/application/use-cases/motors/sync-motor-catalog";
import { softDeleteMotorUseCase } from "@/application/use-cases/soft-delete-motor";
import { upsertMotorUseCase } from "@/application/use-cases/upsert-motor";
import { GridEditorOverlay } from "@/components/grid/grid-editor-overlay";
import { GridFillHandle } from "@/components/grid/grid-fill-handle";
import { useWorkspace } from "@/components/layout/workspace-context";
import { GridZoomControl } from "@/components/motors/grid-zoom-control";
import { MotorDocumentsDialog, MotorHistoryDialog } from "@/components/motors/motor-documents-dialog";
import { MotorEntity } from "@/domain/motor";
import {
  buildGridRows,
  buildSavedMotorRowFromCreate,
  createEmptyRow,
  growRows,
  hasSaveableContent,
  MotorGridRow,
  MotorRowDefaults,
  rowFieldValueByModelField,
} from "@/lib/grid/grid-data-store";
import {
  boundingDataRange,
  findLastUsedCell,
  jumpColumnInRow,
  jumpRowInColumn,
} from "@/lib/grid/grid-data-region-navigation";
import { buildFillOperations } from "@/lib/grid/grid-fill-engine";
import { buildGridLayoutMetrics, cellFrame } from "@/lib/grid/grid-layout-engine";
import { GridMutation, GridCommandBus } from "@/lib/grid/grid-command-bus";
import { isRedoShortcut, isUndoShortcut } from "@/lib/grid/grid-keyboard-shortcuts";
import { resolvePointerCell } from "@/lib/grid/pointer-to-cell";
import { useGridScrollIntoView } from "@/lib/grid/scroll-into-view";
import { useGridScrollWhileDrag } from "@/lib/grid/grid-scroll-while-drag";
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
import { GridCellAddress, GridColumnDefinition, GridRange, isCellInsideRange, normalizeRange } from "@/lib/grid/grid-types";
import { formatMotorDate, parseMotorDateInput } from "@/lib/motor-dates";
import {
  MOTOR_GRID_EMPTY_ROWS_EXPAND,
  MOTOR_GRID_EMPTY_ROWS_THRESHOLD,
} from "@/lib/motor-grid-layout";
import { MotorRepository, isMotorRowEmpty } from "@/infrastructure/firestore/motor-repository";
import { BrandEntity, CatalogRepository, EngineEntity } from "@/infrastructure/firestore/catalog-repository";
import { resolveGridColumnAutocomplete, pickColumnAutocompleteMatch } from "@/lib/grid/grid-column-autocomplete";
import { gridPalette } from "@/lib/grid/grid-palette";
import { mapAuthError } from "@/lib/user-copy";
import { cn } from "@/lib/utils";

type MotorsExcelGridProps = {
  motors: MotorEntity[];
  companyId: string;
  uid: string;
  canEdit: boolean;
  soldOnly?: boolean;
  brands?: BrandEntity[];
  engines?: EngineEntity[];
  catalogRepository?: CatalogRepository;
  defaultBrandName?: string;
  defaultEngineCode?: string;
  onSell: (motor: MotorEntity) => void;
  onUnsell: (motor: MotorEntity) => void;
  onBatchSell?: (motors: MotorEntity[]) => void;
  onBatchUnsell?: (motors: MotorEntity[]) => void;
  repository: MotorRepository;
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
  selected: MotorEntity[];
};

function motorGridCellClass(columnId: string): string {
  switch (columnId) {
    case "brandName":
    case "engineCode":
      return "font-medium tracking-[-0.01em] text-foreground";
    case "serialCode":
    case "arrivalDate":
    case "soldDate":
    case "quantity":
    case "rowNumber":
      return "tabular-nums tracking-[0.01em]";
    case "configuration":
    case "transmission":
      return "text-foreground/90";
    case "notes":
      return "text-muted-foreground";
    default:
      return "";
  }
}

function columnAt(columns: GridColumnDefinition[], column: number): GridColumnDefinition | undefined {
  return columns[column];
}

function columnIdAt(columns: GridColumnDefinition[], column: number): string | undefined {
  return columns[column]?.id;
}

function motorGridColumnBounds(columns: GridColumnDefinition[]) {
  let editableStart = -1;
  let editableEnd = -1;
  let actionColumn = -1;
  for (let index = 0; index < columns.length; index += 1) {
    const column = columns[index];
    if (column.id === "action") actionColumn = index;
    if (!column.editable || !column.modelField) continue;
    if (editableStart < 0) editableStart = index;
    editableEnd = index;
  }
  return {
    editableStart: Math.max(0, editableStart),
    editableEnd: Math.max(0, editableEnd),
    actionColumn: Math.max(0, actionColumn),
  };
}

function navigableDataColumnIndexes(columns: GridColumnDefinition[]): number[] {
  return columns.flatMap((column, index) =>
    column.editable && column.modelField && column.id !== "quantity" ? [index] : [],
  );
}

function isEditableColumn(column: number, columns: GridColumnDefinition[]): boolean {
  const def = columnAt(columns, column);
  return Boolean(def?.editable && def.modelField);
}

function isDateColumn(column: number, columns: GridColumnDefinition[]): boolean {
  const id = columnIdAt(columns, column);
  return id === "arrivalDate" || id === "soldDate";
}

function valueAtCell(row: MotorGridRow, column: number, columns: GridColumnDefinition[]): string {
  const def = columnAt(columns, column);
  if (!def) return "";
  if (def.id === "rowNumber" || def.id === "action") return "";
  return rowFieldValueByModelField(row, def.modelField);
}

function applyCellValue(
  row: MotorGridRow,
  column: number,
  value: string,
  columns: GridColumnDefinition[],
): MotorGridRow {
  const field = columnAt(columns, column)?.modelField;
  const next = { ...row };
  switch (field) {
    case "brandName":
      next.brandName = value;
      break;
    case "engineCode":
      next.engineCode = value;
      break;
    case "serialCode":
      next.serialCode = value;
      break;
    case "configuration":
      next.configuration = value;
      break;
    case "notes":
      next.notes = value;
      break;
    case "quantity": {
      const parsed = Number(value);
      next.quantity = Number.isFinite(parsed) && parsed > 0 ? Math.floor(parsed) : 1;
      break;
    }
    case "transmission":
      next.transmission = value;
      break;
    case "arrivalDate":
      next.arrivalDate = parseMotorDateInput(value);
      break;
    case "soldDate":
      next.soldDate = parseMotorDateInput(value);
      break;
    default:
      break;
  }
  return next;
}

function isInteractiveGridTarget(target: EventTarget | null): boolean {
  return target instanceof HTMLElement && Boolean(target.closest("button, a, input, textarea, select"));
}

function getContextSelectedMotors(rows: MotorGridRow[], selection: GridSelectionState): MotorEntity[] {
  const unique = new Map<string, MotorEntity>();
  for (const range of allRanges(selection)) {
    for (let row = range.minRow; row <= range.maxRow; row += 1) {
      const item = rows[row];
      if (!item || item.rowKind !== "saved") continue;
      unique.set(item.id, item);
    }
  }
  return [...unique.values()];
}

function reconcileRowsWithRemote(
  currentRows: MotorGridRow[],
  incomingMotors: MotorEntity[],
  companyId: string,
  dirtyRowIds: Set<string>,
  defaults?: MotorRowDefaults,
): MotorGridRow[] {
  const currentSavedById = new Map(
    currentRows
      .filter((row): row is MotorGridRow & { rowKind: "saved" } => row.rowKind === "saved")
      .map((row) => [row.id, row]),
  );

  const seenIds = new Set<string>();
  const nextSaved: MotorGridRow[] = [];
  for (const motor of incomingMotors) {
    if (seenIds.has(motor.id)) continue;
    seenIds.add(motor.id);
    const rowId = `saved-${motor.id}`;
    if (dirtyRowIds.has(rowId)) {
      const preserved = currentSavedById.get(motor.id);
      if (preserved) {
        nextSaved.push(preserved);
        continue;
      }
    }
    nextSaved.push({
      ...motor,
      rowKind: "saved",
      rowId,
    });
  }

  const dirtyDraftRows = currentRows.filter((row) => {
    if (row.rowKind !== "empty" || !dirtyRowIds.has(row.rowId)) return false;
    const serial = row.serialCode.trim().toLowerCase();
    if (!serial) return true;
    return !nextSaved.some((saved) => saved.serialCode.trim().toLowerCase() === serial);
  });

  const targetCount = Math.max(currentRows.length, nextSaved.length + dirtyDraftRows.length);
  const nextRows: MotorGridRow[] = [...nextSaved, ...dirtyDraftRows];
  while (nextRows.length < targetCount) {
    nextRows.push(createEmptyRow(companyId, defaults));
  }
  return nextRows;
}

export function MotorsExcelGrid({
  motors,
  companyId,
  uid,
  canEdit,
  soldOnly = false,
  brands = [],
  engines = [],
  catalogRepository,
  defaultBrandName,
  defaultEngineCode,
  onSell,
  onUnsell,
  onBatchSell,
  onBatchUnsell,
  repository,
  onCloudPendingChange,
}: MotorsExcelGridProps) {
  const {
    setSaveStatus,
    setSaveError,
    registerSaveHandler,
    registerGridUndoHandler,
    registerGridRedoHandler,
    registerCloudPushHandler,
    gridZoom,
  } = useWorkspace();
  const gridEntering = useGridEnterMotion();

  const hideBrandColumn = Boolean(defaultBrandName?.trim());
  const layout = useMemo(
    () =>
      buildGridLayoutMetrics(gridZoom, {
        hiddenColumnIds: hideBrandColumn ? ["brandName"] : [],
      }),
    [gridZoom, hideBrandColumn],
  );
  const layoutColumns = layout.columns;
  const gridBounds = useMemo(() => motorGridColumnBounds(layoutColumns), [layoutColumns]);
  const navigableColumns = useMemo(
    () => navigableDataColumnIndexes(layoutColumns),
    [layoutColumns],
  );

  useEffect(() => {
    setSelection(initialSelection);
  }, [hideBrandColumn]);

  const gridRef = useRef<HTMLDivElement>(null);
  const bodyRef = useRef<HTMLDivElement>(null);
  const commandBusRef = useRef(new GridCommandBus());
  const motorsRef = useRef(motors);
  const dirtyRowsRef = useRef<Set<string>>(new Set());
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

  const rowDefaults = useMemo<MotorRowDefaults>(
    () => ({
      brandName: defaultBrandName?.trim() || undefined,
      engineCode: defaultEngineCode?.trim() || undefined,
    }),
    [defaultBrandName, defaultEngineCode],
  );

  const brandNameOptions = useMemo(
    () => [...new Set(brands.map((brand) => brand.name.trim()).filter(Boolean))],
    [brands],
  );

  const engineCodesByBrand = useMemo(() => {
    const brandByLocalId = new Map(brands.map((brand) => [brand.localId, brand.name]));
    const map = new Map<string, string[]>();
    for (const engine of engines) {
      const brandName = brandByLocalId.get(engine.brandLocalId);
      if (!brandName) continue;
      const key = brandName.toLowerCase();
      const list = map.get(key) ?? [];
      if (!list.includes(engine.code)) list.push(engine.code);
      map.set(key, list);
    }
    return map;
  }, [brands, engines]);

  const [rows, setRows] = useState<MotorGridRow[]>(() => buildGridRows(motors, companyId, undefined, rowDefaults));
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
  const [documentsMotor, setDocumentsMotor] = useState<MotorEntity | null>(null);
  const [historyMotor, setHistoryMotor] = useState<MotorEntity | null>(null);

  useEffect(() => {
    motorsRef.current = motors;
    setRows((current) =>
      reconcileRowsWithRemote(current, motors, companyId, dirtyRowsRef.current, rowDefaults),
    );
  }, [companyId, motors, rowDefaults]);

  useEffect(() => {
    onCloudPendingChange?.(dirtyRowsRef.current.size > 0);
  }, [dirtyVersion, onCloudPendingChange]);

  useEffect(() => {
    const dirtyIds = dirtyRowsRef.current;
    if (dirtyIds.size === 0) {
      setSaveStatus("idle");
      return;
    }
    const hasUnsavedLocal = [...dirtyIds].some((rowId) => !localSaveAckRef.current.has(rowId));
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

  const editorAutocompleteMatch = useMemo(() => {
    if (!editor) return null;
    const editingColumnId = columnIdAt(layoutColumns, editor.cell.column);
    if (editingColumnId === "brandName") {
      return pickColumnAutocompleteMatch(editor.value, brandNameOptions);
    }
    if (editingColumnId === "engineCode") {
      const rowBrand = rows[editor.cell.row]?.brandName?.trim();
      const scoped = rowBrand
        ? engineCodesByBrand.get(rowBrand.toLowerCase()) ?? []
        : engines.map((engine) => engine.code);
      const fromRows = resolveGridColumnAutocomplete(
        editor,
        rows.length,
        (row, column) => valueAtCell(rows[row], column, layoutColumns),
        (column) => columnIdAt(layoutColumns, column) === "engineCode",
      );
      const merged = [...new Set([...scoped, ...(fromRows ? [fromRows] : [])])];
      return pickColumnAutocompleteMatch(editor.value, merged) ?? fromRows;
    }
    return resolveGridColumnAutocomplete(
      editor,
      rows.length,
      (row, column) => valueAtCell(rows[row], column, layoutColumns),
      (column) => {
        const columnId = columnIdAt(layoutColumns, column);
        return (
          isEditableColumn(column, layoutColumns) &&
          !isDateColumn(column, layoutColumns) &&
          columnId !== "quantity"
        );
      },
    );
  }, [brandNameOptions, editor, engineCodesByBrand, engines, layoutColumns, rows]);

  const scheduleDirtyStatus = useCallback(() => {
    if (dirtyStatusScheduledRef.current) return;
    dirtyStatusScheduledRef.current = true;
    queueMicrotask(() => {
      dirtyStatusScheduledRef.current = false;
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

  const setCell = useCallback((cell: GridCellAddress, newValue: string, options?: { trackUndo?: boolean; markDirty?: boolean }) => {
    setRows((current) => {
      const row = current[cell.row];
      if (!row || !isEditableColumn(cell.column, layoutColumns)) return current;
      const oldValue = valueAtCell(row, cell.column, layoutColumns);
      if (oldValue === newValue) return current;
      const next = [...current];
      const updatedRow = applyCellValue(row, cell.column, newValue, layoutColumns);
      if (
        row.rowKind === "empty" &&
        updatedRow.arrivalDate == null &&
        (updatedRow.serialCode.trim() || updatedRow.configuration.trim() || updatedRow.notes.trim())
      ) {
        updatedRow.arrivalDate = new Date();
      }
      next[cell.row] = updatedRow;
      if (options?.trackUndo !== false) {
        commandBusRef.current.commit("Edit Cell", [
          { address: cell, oldValue, newValue },
        ]);
      }
      if (options?.markDirty !== false) {
        markDirty(updatedRow.rowId);
      }
      return next;
    });
  }, [layoutColumns, markDirty]);

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
      if (distance > MOTOR_GRID_EMPTY_ROWS_THRESHOLD) return current;
      return growRows(current, companyId, MOTOR_GRID_EMPTY_ROWS_EXPAND, rowDefaults);
    });
  }, [companyId, rowDefaults]);

  const flushEditor = useCallback(() => {
    const currentEditor = editorRef.current;
    if (!currentEditor) return;
    setCell(currentEditor.cell, currentEditor.value);
    setEditor(null);
  }, [setCell]);

  const runSave = useCallback(() => {
    flushEditor();
  }, [flushEditor]);

  const pushToCloud = useCallback(async () => {
    flushEditor();
    if (!uid || !companyId || !canEdit) return;
    if (dirtyRowsRef.current.size === 0) {
      setSaveStatus("idle");
      return;
    }

    setSaveStatus("saving");
    setSaveError(null);

    try {
      const snapshotRows = rows;
      const baselineById = new Map(motorsRef.current.map((motor) => [motor.id, motor]));
      const dirtyRowIds = [...dirtyRowsRef.current];
      const createTasks: Array<() => Promise<{ rowId: string; motorId: string; row: MotorGridRow } | null>> = [];
      const parallelTasks: Array<Promise<void>> = [];
      const catalogRows: MotorGridRow[] = [];
      let workingBrands = brands;
      let workingEngines = engines;

      for (const rowId of dirtyRowIds) {
        const row = snapshotRows.find((item) => item.rowId === rowId);
        if (!row) continue;
        if (row.rowKind === "empty") {
          if (!hasSaveableContent(row)) continue;
          const emptyRow = row as MotorGridRow & { rowKind: "empty" };
          catalogRows.push(emptyRow);
          createTasks.push(async () => {
            const motorId = await createMotorUseCase(
              repository,
              uid,
              {
                companyId,
                serialCode: emptyRow.serialCode.trim(),
                configuration: emptyRow.configuration,
                notes: emptyRow.notes,
                quantity: emptyRow.quantity,
                transmission: emptyRow.transmission,
                arrivalDate: emptyRow.arrivalDate ?? new Date(),
                brandName: emptyRow.brandName,
                engineCode: emptyRow.engineCode,
              },
              motorsRef.current,
            );
            return { rowId, motorId, row: emptyRow };
          });
          continue;
        }
        if (isMotorRowEmpty(row)) {
          parallelTasks.push(
            softDeleteMotorUseCase(repository, uid, row.id, {
              companyId,
              localId: row.localId ?? Number(row.id),
              serialCode: row.serialCode,
              configuration: row.configuration,
              notes: row.notes,
              quantity: row.quantity,
              transmission: row.transmission,
              arrivalDate: row.arrivalDate,
              brandName: row.brandName,
              engineCode: row.engineCode,
            }),
          );
          continue;
        }

        const baseline = baselineById.get(row.id);
        if (!baseline) continue;
        const changed =
          baseline.serialCode !== row.serialCode ||
          baseline.configuration !== row.configuration ||
          baseline.notes !== row.notes ||
          baseline.quantity !== row.quantity ||
          baseline.transmission !== row.transmission ||
          (baseline.brandName ?? "") !== (row.brandName ?? "") ||
          (baseline.engineCode ?? "") !== (row.engineCode ?? "") ||
          (baseline.arrivalDate?.getTime() ?? 0) !== (row.arrivalDate?.getTime() ?? 0);
        if (!changed) continue;
        catalogRows.push(row);
        parallelTasks.push(
          upsertMotorUseCase(repository, uid, row.id, {
            companyId,
            localId: row.localId ?? Number(row.id),
            serialCode: row.serialCode.trim(),
            configuration: row.configuration,
            notes: row.notes,
            quantity: row.quantity,
            transmission: row.transmission,
            arrivalDate: row.arrivalDate,
            soldDate: row.soldDate ?? null,
            brandName: row.brandName,
            engineCode: row.engineCode,
          }).then(() => undefined),
        );
      }

      const rowReplacements = new Map<string, MotorGridRow>();
      let createdCount = 0;
      for (const createTask of createTasks) {
        const outcome = await createTask();
        if (!outcome) continue;
        if (outcome.row.rowKind !== "empty") continue;
        const emptyRow = outcome.row as MotorGridRow & { rowKind: "empty" };
        createdCount += 1;
        dirtyRowsRef.current.delete(outcome.rowId);
        rowReplacements.set(outcome.rowId, buildSavedMotorRowFromCreate(emptyRow, outcome.motorId, companyId));
      }
      await Promise.all(parallelTasks);

      for (const row of catalogRows) {
        if (!catalogRepository) continue;
        const synced = await syncMotorCatalogUseCase(catalogRepository, {
          companyId,
          brandName: row.brandName,
          engineCode: row.engineCode,
          existingBrands: workingBrands,
          existingEngines: workingEngines,
        });
        workingBrands = synced.brands;
        workingEngines = synced.engines;
      }

      if (rowReplacements.size > 0) {
        setRows((current) =>
          current.map((currentRow) => rowReplacements.get(currentRow.rowId) ?? currentRow),
        );
      }

      const pushedRowIds = [...dirtyRowsRef.current].map((rowId) => rowReplacements.get(rowId)?.rowId ?? rowId);
      dirtyRowsRef.current.clear();
      localSaveAckRef.current.clear();
      setDirtyVersion((current) => current + 1);
      setSaveStatus("saved");
      if (pushedRowIds.length > 0) {
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
  }, [brands, canEdit, catalogRepository, companyId, engines, flushEditor, repository, rows, setSaveError, setSaveStatus, uid]);

  useEffect(() => {
    registerSaveHandler(runSave);
    return () => registerSaveHandler(null);
  }, [registerSaveHandler, runSave]);

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
      const pending = pendingSelectionDragRef.current;
      if (pending?.target.hasPointerCapture(pending.pointerId)) {
        pending.target.releasePointerCapture(pending.pointerId);
      }
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
          valueAt: (cell) => valueAtCell(rows[cell.row], cell.column, layoutColumns),
          isEditableColumn: (column) => isEditableColumn(column, layoutColumns),
          isDateColumn: (column) => isDateColumn(column, layoutColumns),
        });
        const mutations: GridMutation[] = [];
        setRows((current) => {
          const next = [...current];
          for (const operation of ops) {
            if (!next[operation.cell.row]) continue;
            const oldValue = valueAtCell(next[operation.cell.row], operation.cell.column, layoutColumns);
            if (oldValue === operation.value) continue;
            next[operation.cell.row] = applyCellValue(next[operation.cell.row], operation.cell.column, operation.value, layoutColumns);
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

  useGridScrollWhileDrag({
    bodyRef,
    isDragging: () =>
      isDraggingSelectionRef.current ||
      isDraggingFillRef.current ||
      pendingSelectionDragRef.current != null,
  });

  useEffect(() => {
    function closeContext() {
      setContextMenu(null);
    }
    window.addEventListener("click", closeContext);
    return () => window.removeEventListener("click", closeContext);
  }, []);

  const resolveScrollFrame = useCallback(
    (cell: GridCellAddress) => cellFrame(layout, cell),
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

  const beginEdit = useCallback((cell: GridCellAddress, seed?: string, selectAll = true) => {
    if (!isEditableColumn(cell.column, layoutColumns)) return;
    const row = rows[cell.row];
    if (!row || !canEdit) return;
    const value = seed ?? valueAtCell(row, cell.column, layoutColumns);
    setEditor({ cell, value, initialValue: value, selectAll });
    scrollToCell(cell);
  }, [canEdit, rows, scrollToCell]);

  const commitEditor = useCallback((direction?: "down" | "up" | "left" | "right") => {
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
    if (direction === "right") next.column = Math.min(layout.columns.length - 1, next.column + 1);
    if (direction === "left") next.column = Math.max(gridBounds.editableStart, next.column - 1);
    next.column = Math.max(gridBounds.editableStart, Math.min(gridBounds.editableEnd, next.column));
    if (next.row >= rows.length) {
      setRows((current) => growRows(current, companyId, MOTOR_GRID_EMPTY_ROWS_EXPAND, rowDefaults));
    }
    setSelection({
      anchor: next,
      head: next,
      cmdRanges: [],
    });
    scrollToCell(next);
    focusGrid();
  }, [companyId, editor, focusGrid, layout.columns.length, rows.length, scrollToCell, setCell]);

  const clearRange = useCallback((range: GridRange) => {
    setRows((current) => {
      const next = [...current];
      const mutations: GridMutation[] = [];

      for (let row = range.minRow; row <= range.maxRow; row += 1) {
        for (let column = range.minColumn; column <= range.maxColumn; column += 1) {
          if (!isEditableColumn(column, layoutColumns)) continue;
          const rowRef = next[row];
          if (!rowRef) continue;
          const currentValue = valueAtCell(rowRef, column, layoutColumns);
          if (!currentValue) continue;
          next[row] = applyCellValue(rowRef, column, "", layoutColumns);
          localSaveAckRef.current.delete(next[row].rowId);
          dirtyRowsRef.current.add(next[row].rowId);
          mutations.push({
            address: { row, column },
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
  }, [layoutColumns, scheduleDirtyStatus]);

  const clearPrimaryRange = useCallback(() => {
    clearRange(primaryRange(selectionRef.current));
  }, [clearRange]);

  const copyPrimaryRange = useCallback(async () => {
    const range = primaryRange(selection);
    const lines: string[] = [];
    for (let row = range.minRow; row <= range.maxRow; row += 1) {
      const cells: string[] = [];
      for (let column = range.minColumn; column <= range.maxColumn; column += 1) {
        cells.push(valueAtCell(rows[row], column, layoutColumns));
      }
      lines.push(cells.join("\t"));
    }
    await navigator.clipboard.writeText(lines.join("\n"));
  }, [layoutColumns, rows, selection]);

  const pasteAtSelection = useCallback(async () => {
    const clipboard = await navigator.clipboard.readText();
    if (!clipboard) return;
    const matrix = clipboard.split(/\r?\n/).map((line) => line.split("\t"));
    const start = selection.head;
    const targetMaxRow = start.row + matrix.length - 1;
    if (targetMaxRow >= rows.length - 1) {
      setRows((current) => growRows(current, companyId, targetMaxRow - current.length + MOTOR_GRID_EMPTY_ROWS_EXPAND + 1, rowDefaults));
    }

    const mutations: GridMutation[] = [];
    setRows((current) => {
      const next = [...current];
      for (let r = 0; r < matrix.length; r += 1) {
        const rowIndex = start.row + r;
        if (rowIndex >= next.length) break;
        for (let c = 0; c < matrix[r].length; c += 1) {
          const colIndex = start.column + c;
          if (!isEditableColumn(colIndex, layoutColumns)) continue;
          const oldValue = valueAtCell(next[rowIndex], colIndex, layoutColumns);
          const newValue = matrix[r][c];
          if (oldValue === newValue) continue;
          next[rowIndex] = applyCellValue(next[rowIndex], colIndex, newValue, layoutColumns);
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
  }, [companyId, layoutColumns, markDirty, rowDefaults, rows.length, selection.head]);

  const fillWithActive = useCallback(() => {
    const range = primaryRange(selection);
    const seed = valueAtCell(rows[selection.head.row], selection.head.column, layoutColumns);
    const mutations: GridMutation[] = [];
    setRows((current) => {
      const next = [...current];
      for (let row = range.minRow; row <= range.maxRow; row += 1) {
        for (let col = range.minColumn; col <= range.maxColumn; col += 1) {
          if (!isEditableColumn(col, layoutColumns)) continue;
          if (row === selection.head.row && col === selection.head.column) continue;
          const oldValue = valueAtCell(next[row], col, layoutColumns);
          if (oldValue === seed) continue;
          next[row] = applyCellValue(next[row], col, seed, layoutColumns);
          markDirty(next[row].rowId);
          mutations.push({ address: { row, column: col }, oldValue, newValue: seed });
        }
      }
      return next;
    });
    commandBusRef.current.commit("Ctrl+Enter", mutations);
  }, [layoutColumns, markDirty, rows, selection]);

  const fillDown = useCallback(() => {
    const range = primaryRange(selection);
    if (range.maxRow <= range.minRow) return;
    const mutations: GridMutation[] = [];
    setRows((current) => {
      const next = [...current];
      for (let col = range.minColumn; col <= range.maxColumn; col += 1) {
        if (!isEditableColumn(col, layoutColumns)) continue;
        const source = valueAtCell(next[range.minRow], col, layoutColumns);
        for (let row = range.minRow + 1; row <= range.maxRow; row += 1) {
          const oldValue = valueAtCell(next[row], col, layoutColumns);
          if (oldValue === source) continue;
          next[row] = applyCellValue(next[row], col, source, layoutColumns);
          markDirty(next[row].rowId);
          mutations.push({ address: { row, column: col }, oldValue, newValue: source });
        }
      }
      return next;
    });
    commandBusRef.current.commit("Fill Down", mutations);
  }, [layoutColumns, markDirty, selection]);

  const fillRight = useCallback(() => {
    const range = primaryRange(selection);
    if (range.maxColumn <= range.minColumn) return;
    const mutations: GridMutation[] = [];
    setRows((current) => {
      const next = [...current];
      for (let row = range.minRow; row <= range.maxRow; row += 1) {
        const source = valueAtCell(next[row], range.minColumn, layoutColumns);
        for (let col = range.minColumn + 1; col <= range.maxColumn; col += 1) {
          if (!isEditableColumn(col, layoutColumns)) continue;
          const oldValue = valueAtCell(next[row], col, layoutColumns);
          if (oldValue === source) continue;
          next[row] = applyCellValue(next[row], col, source, layoutColumns);
          markDirty(next[row].rowId);
          mutations.push({ address: { row, column: col }, oldValue, newValue: source });
        }
      }
      return next;
    });
    commandBusRef.current.commit("Fill Right", mutations);
  }, [layoutColumns, markDirty, selection]);

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
          navigableColumns,
          isEmpty: (row, column) => !valueAtCell(rows[row], column, layoutColumns).trim(),
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
      setSelection(selectWholeRow(selection.head.row, gridBounds.editableStart, gridBounds.editableEnd));
      return;
    }
    if (key === "F2") {
      event.preventDefault();
      beginEdit(selection.head, undefined, true);
      return;
    }
    if (key === "Delete" || key === "Backspace") {
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
        setSelection({ anchor: { row: 0, column: gridBounds.editableStart }, head: { row: 0, column: gridBounds.editableStart }, cmdRanges: [] });
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
          navigableColumns,
          isEmpty: (row, column) => !valueAtCell(rows[row], column, layoutColumns).trim(),
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
            navigableColumns,
            isEmpty: (row, column) => !valueAtCell(rows[row], column, layoutColumns).trim(),
          });
          setSelection({ anchor: { row: head.row, column: target }, head: { row: head.row, column: target }, cmdRanges: [] });
        } else {
          const target = jumpRowInColumn({
            column: head.column,
            fromRow: head.row,
            direction: key === "ArrowDown" ? 1 : -1,
            rowCount: rows.length,
            isEmpty: (row, column) => !valueAtCell(rows[row], column, layoutColumns).trim(),
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
    const col = Math.min(primary.maxColumn, gridBounds.editableEnd);
    if (!isEditableColumn(col, layoutColumns)) return null;
    return { row: primary.maxRow, column: col };
  }, [gridBounds.editableEnd, layoutColumns, primary.maxColumn, primary.maxRow]);

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
          className="absolute inset-0 overflow-auto bg-card"
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
            if (event.button === 1 && bodyRef.current) {
              event.preventDefault();
              const viewport = bodyRef.current;
              const startX = event.clientX;
              const startY = event.clientY;
              const originLeft = viewport.scrollLeft;
              const originTop = viewport.scrollTop;

              function onMouseMove(moveEvent: MouseEvent) {
                viewport.scrollLeft = originLeft - (moveEvent.clientX - startX);
                viewport.scrollTop = originTop - (moveEvent.clientY - startY);
              }

              function onMouseUp() {
                window.removeEventListener("mousemove", onMouseMove);
                window.removeEventListener("mouseup", onMouseUp);
              }

              window.addEventListener("mousemove", onMouseMove);
              window.addEventListener("mouseup", onMouseUp);
              return;
            }
            if (editor) setEditor(null);
          }}
        >
          <div
            className="relative antialiased"
            style={{
              width: layout.totalWidth,
              height: layout.headerHeight + rows.length * layout.rowHeight,
              fontSize: `${Math.max(12, Math.round(13 * gridZoom))}px`,
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
                      "absolute top-0 flex border-r px-2.5 text-[10px] font-semibold uppercase tracking-[0.08em] text-muted-foreground",
                      column.align === "center" ? "items-center justify-center" : "items-center justify-start",
                    )}
                    style={{
                      left: layout.xOffsets[colIdx],
                      width: column.width,
                      height: layout.headerHeight,
                    }}
                    onClick={() => {
                      if (!isEditableColumn(colIdx, layoutColumns)) return;
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
                      const cell = cellFrame(layout, { row: rowIdx, column: colIdx });
                      const displayValue =
                        column.id === "rowNumber"
                          ? String(rowIdx + 1)
                          : column.id === "arrivalDate"
                            ? (row.arrivalDate ? formatMotorDate(row.arrivalDate) : "")
                            : column.id === "soldDate"
                              ? (row.soldDate ? formatMotorDate(row.soldDate) : "")
                              : valueAtCell(row, colIdx, layoutColumns);

                      return (
                        <div
                          key={`${row.rowId}-${column.id}`}
                          className={cn(
                            "absolute flex border-r border-b px-2.5 text-[13px] leading-[1.35] whitespace-nowrap transition-[background-color,box-shadow] duration-150 ease-out motion-reduce:transition-none",
                            motorGridCellClass(column.id),
                            column.align === "center" ? "items-center justify-center" : "items-center justify-start",
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
                              setSelection(selectWholeRowActiveStart(rowIdx, gridBounds.editableStart, gridBounds.editableEnd));
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
                            if (event.detail === 2 && isEditableColumn(colIdx, layoutColumns)) {
                              beginEdit({ row: rowIdx, column: colIdx });
                            }
                          }}
                          onContextMenu={(event) => {
                            event.preventDefault();
                            const clicked = { row: rowIdx, column: colIdx };
                            const nextSelection = isCellInsideRange(clicked, primaryRange(selection))
                              ? selection
                              : selectWholeRow(rowIdx, gridBounds.editableStart, gridBounds.editableEnd);
                            if (nextSelection !== selection) {
                              setSelection(nextSelection);
                            }
                            setContextMenu({
                              x: event.clientX,
                              y: event.clientY,
                              selected: getContextSelectedMotors(rows, nextSelection),
                            });
                          }}
                        >
                          {column.id === "action" ? (
                            row.rowKind === "saved" && row.serialCode.trim() && canEdit && (!soldOnly || row.soldDate) ? (
                              <button
                                type="button"
                                className={cn(
                                  "rounded border px-2 py-0.5 text-[11px]",
                                  row.soldDate
                                    ? "border-amber-500/30 bg-amber-500/10 text-amber-700"
                                    : "border-emerald-500/30 bg-emerald-500/10 text-emerald-700",
                                )}
                                onPointerDown={(event) => event.stopPropagation()}
                                onClick={(event) => {
                                  event.stopPropagation();
                                  if (row.soldDate) onUnsell(row);
                                  else onSell(row);
                                }}
                              >
                                {row.soldDate ? "Вернуть" : "Продать"}
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
                      return hasSaveableContent(row) ? index : acc;
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
                      valueAt: (cell) => valueAtCell(rows[cell.row], cell.column, layoutColumns),
                      isEditableColumn: (column) => isEditableColumn(column, layoutColumns),
                      isDateColumn: (column) => isDateColumn(column, layoutColumns),
                    });
                    const mutations: GridMutation[] = [];
                    setRows((current) => {
                      const next = [...current];
                      for (const operation of ops) {
                        const oldValue = valueAtCell(next[operation.cell.row], operation.cell.column, layoutColumns);
                        if (oldValue === operation.value) continue;
                        next[operation.cell.row] = applyCellValue(next[operation.cell.row], operation.cell.column, operation.value, layoutColumns);
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
                  frame={cellFrame(layout, editor.cell)}
                  onChange={(value) => setEditor((current) => (current ? { ...current, value } : current))}
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

      {contextMenu && contextMenu.selected.length > 0 ? (
        <div
          className="animate-tab-enter fixed z-40 min-w-[170px] rounded-md border bg-popover p-1 shadow-md"
          style={{ left: contextMenu.x, top: contextMenu.y }}
        >
          <button
            type="button"
            className="block w-full rounded px-3 py-1.5 text-left text-sm hover:bg-muted disabled:opacity-40"
            disabled={contextMenu.selected.every((item) => item.soldDate)}
            onClick={() => {
              const targets = contextMenu.selected.filter((item) => !item.soldDate);
              if (targets.length === 0) return;
              if (targets.length === 1) onSell(targets[0]!);
              else if (onBatchSell) onBatchSell(targets);
              else targets.forEach((motor) => onSell(motor));
              setContextMenu(null);
            }}
          >
            Продать ({contextMenu.selected.filter((item) => !item.soldDate).length})
          </button>
          <button
            type="button"
            className="block w-full rounded px-3 py-1.5 text-left text-sm hover:bg-muted disabled:opacity-40"
            disabled={contextMenu.selected.every((item) => !item.soldDate)}
            onClick={() => {
              const targets = contextMenu.selected.filter((item) => item.soldDate);
              if (targets.length === 0) return;
              if (targets.length === 1) onUnsell(targets[0]!);
              else if (onBatchUnsell) onBatchUnsell(targets);
              else targets.forEach((motor) => onUnsell(motor));
              setContextMenu(null);
            }}
          >
            Вернуть в наличие ({contextMenu.selected.filter((item) => item.soldDate).length})
          </button>
          {contextMenu.selected.length === 1 ? (
            <>
              <button
                type="button"
                className="block w-full rounded px-3 py-1.5 text-left text-sm hover:bg-muted"
                onClick={() => {
                  setHistoryMotor(contextMenu.selected[0]!);
                  setContextMenu(null);
                }}
              >
                История изменений
              </button>
              <button
                type="button"
                className="block w-full rounded px-3 py-1.5 text-left text-sm hover:bg-muted"
                onClick={() => {
                  setDocumentsMotor(contextMenu.selected[0]!);
                  setContextMenu(null);
                }}
              >
                PDF · гарантия / счёт
              </button>
            </>
          ) : null}
        </div>
      ) : null}

      <MotorHistoryDialog
        motor={historyMotor}
        open={Boolean(historyMotor)}
        onOpenChange={(open) => {
          if (!open) setHistoryMotor(null);
        }}
      />
      <MotorDocumentsDialog
        motor={documentsMotor}
        open={Boolean(documentsMotor)}
        onOpenChange={(open) => {
          if (!open) setDocumentsMotor(null);
        }}
      />
    </div>
  );
}
