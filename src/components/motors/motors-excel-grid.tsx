"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import { createMotorUseCase } from "@/application/use-cases/create-motor";
import { softDeleteMotorUseCase } from "@/application/use-cases/soft-delete-motor";
import { upsertMotorUseCase } from "@/application/use-cases/upsert-motor";
import { GridEditorOverlay } from "@/components/grid/grid-editor-overlay";
import { GridFillHandle } from "@/components/grid/grid-fill-handle";
import { useWorkspace } from "@/components/layout/workspace-context";
import { GridZoomControl } from "@/components/motors/grid-zoom-control";
import { MotorEntity } from "@/domain/motor";
import {
  buildGridRows,
  createEmptyRow,
  growRows,
  hasSaveableContent,
  MotorGridRow,
  rowFieldValue,
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
import {
  allRanges,
  clickSelection,
  dragSelection,
  GridSelectionState,
  initialSelection,
  primaryRange,
  selectWholeColumn,
  selectWholeRow,
} from "@/lib/grid/selection-controller";
import { GridCellAddress, GridRange, isCellInsideRange, normalizeRange } from "@/lib/grid/grid-types";
import { formatMotorDate, parseMotorDateInput } from "@/lib/motor-dates";
import {
  MOTOR_GRID_EMPTY_ROWS_EXPAND,
  MOTOR_GRID_EMPTY_ROWS_THRESHOLD,
} from "@/lib/motor-grid-layout";
import { MotorRepository, isMotorRowEmpty } from "@/infrastructure/firestore/motor-repository";
import { gridPalette } from "@/lib/grid/grid-palette";
import { mapAuthError } from "@/lib/user-copy";
import { cn } from "@/lib/utils";

type MotorsExcelGridProps = {
  motors: MotorEntity[];
  companyId: string;
  uid: string;
  canEdit: boolean;
  soldOnly?: boolean;
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
  selectAll: boolean;
};

type ContextMenuState = {
  x: number;
  y: number;
  selected: MotorEntity[];
};

const EDITABLE_COL_START = 1;
const EDITABLE_COL_END = 6;

function isEditableColumn(column: number): boolean {
  return column >= EDITABLE_COL_START && column <= EDITABLE_COL_END;
}

function isDateColumn(column: number): boolean {
  return column === 6 || column === 7;
}

function isInteractiveGridTarget(target: EventTarget | null): boolean {
  return target instanceof HTMLElement && Boolean(target.closest("button, a, input, textarea, select"));
}

function valueAtCell(row: MotorGridRow, column: number): string {
  if (column === 0) return "";
  if (column === 8) return "";
  return rowFieldValue(row, column);
}

function applyCellValue(row: MotorGridRow, column: number, value: string): MotorGridRow {
  const next = { ...row };
  switch (column) {
    case 1:
      next.serialCode = value;
      break;
    case 2:
      next.configuration = value;
      break;
    case 3:
      next.notes = value;
      break;
    case 4: {
      const parsed = Number(value);
      next.quantity = Number.isFinite(parsed) && parsed > 0 ? Math.floor(parsed) : 1;
      break;
    }
    case 5:
      next.transmission = value;
      break;
    case 6:
      next.arrivalDate = parseMotorDateInput(value);
      break;
    default:
      break;
  }
  return next;
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

  const dirtyDraftRows = currentRows.filter(
    (row) => row.rowKind === "empty" && dirtyRowIds.has(row.rowId),
  );

  const targetCount = Math.max(currentRows.length, nextSaved.length + dirtyDraftRows.length);
  const nextRows: MotorGridRow[] = [...nextSaved, ...dirtyDraftRows];
  while (nextRows.length < targetCount) {
    nextRows.push(createEmptyRow(companyId));
  }
  return nextRows;
}

export function MotorsExcelGrid({
  motors,
  companyId,
  uid,
  canEdit,
  soldOnly = false,
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
    registerCloudPushHandler,
    gridZoom,
  } = useWorkspace();

  const layout = useMemo(() => buildGridLayoutMetrics(gridZoom), [gridZoom]);

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
  } | null>(null);
  const isDraggingFillRef = useRef(false);
  const fillSourceRef = useRef<GridRange | null>(null);
  const fillTargetRef = useRef<GridRange | null>(null);

  const [rows, setRows] = useState<MotorGridRow[]>(() => buildGridRows(motors, companyId));
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

  useEffect(() => {
    motorsRef.current = motors;
    setRows((current) =>
      reconcileRowsWithRemote(current, motors, companyId, dirtyRowsRef.current),
    );
  }, [companyId, motors]);

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

  const markDirty = useCallback((rowId: string) => {
    localSaveAckRef.current.delete(rowId);
    if (!dirtyRowsRef.current.has(rowId)) {
      dirtyRowsRef.current.add(rowId);
      setDirtyVersion((current) => current + 1);
    }
  }, []);

  const setCell = useCallback((cell: GridCellAddress, newValue: string, options?: { trackUndo?: boolean; markDirty?: boolean }) => {
    setRows((current) => {
      const row = current[cell.row];
      if (!row || !isEditableColumn(cell.column)) return current;
      const oldValue = valueAtCell(row, cell.column);
      if (oldValue === newValue) return current;
      const next = [...current];
      const updatedRow = applyCellValue(row, cell.column, newValue);
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
  }, [markDirty]);

  const applyMutation = useCallback((mutation: GridMutation, reverse: boolean) => {
    setCell(mutation.address, reverse ? mutation.oldValue : mutation.newValue, {
      trackUndo: false,
      markDirty: true,
    });
  }, [setCell]);

  const ensureExpanded = useCallback((lastVisibleRow: number) => {
    setRows((current) => {
      const distance = current.length - lastVisibleRow - 1;
      if (distance > MOTOR_GRID_EMPTY_ROWS_THRESHOLD) return current;
      return growRows(current, companyId, MOTOR_GRID_EMPTY_ROWS_EXPAND);
    });
  }, [companyId]);

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
      for (const rowId of dirtyRowsRef.current) {
        const row = snapshotRows.find((item) => item.rowId === rowId);
        if (!row) continue;
        if (row.rowKind === "empty") {
          if (!hasSaveableContent(row)) continue;
          await createMotorUseCase(
            repository,
            uid,
            {
              companyId,
              serialCode: row.serialCode.trim(),
              configuration: row.configuration,
              notes: row.notes,
              quantity: row.quantity,
              transmission: row.transmission,
              arrivalDate: row.arrivalDate ?? new Date(),
              brandName: row.brandName,
              engineCode: row.engineCode,
            },
            motorsRef.current,
          );
          continue;
        }
        if (isMotorRowEmpty(row)) {
          await softDeleteMotorUseCase(repository, uid, row.id, {
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
          });
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
          (baseline.arrivalDate?.getTime() ?? 0) !== (row.arrivalDate?.getTime() ?? 0);
        if (!changed) continue;
        await upsertMotorUseCase(repository, uid, row.id, {
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
        });
      }
      const pushedRowIds = [...dirtyRowsRef.current];
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
  }, [canEdit, companyId, repository, rows, setSaveError, setSaveStatus, uid]);

  useEffect(() => {
    registerSaveHandler(runSave);
    return () => registerSaveHandler(null);
  }, [registerSaveHandler, runSave]);

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
      const rect = bodyRef.current.getBoundingClientRect();
      const x = clientX - rect.left + bodyRef.current.scrollLeft;
      const y = clientY - rect.top + bodyRef.current.scrollTop;
      const row = Math.floor(y / layout.rowHeight);
      if (row < 0 || row >= rows.length) return null;
      let column = 0;
      while (column < layout.columns.length - 1 && layout.xOffsets[column] + layout.columns[column].width <= x) {
        column += 1;
      }
      return { row, column };
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
  }, [ensureExpanded, layout.columns, layout.rowHeight, layout.xOffsets, markDirty, rows]);

  useEffect(() => {
    function closeContext() {
      setContextMenu(null);
    }
    window.addEventListener("click", closeContext);
    return () => window.removeEventListener("click", closeContext);
  }, []);

  const scrollToCell = useCallback((cell: GridCellAddress) => {
    if (!bodyRef.current) return;
    const frame = cellFrame(layout, cell);
    const viewport = bodyRef.current;
    const top = frame.y;
    const bottom = frame.y + frame.height;
    if (top < viewport.scrollTop) {
      viewport.scrollTop = top;
    } else if (bottom > viewport.scrollTop + viewport.clientHeight) {
      viewport.scrollTop = bottom - viewport.clientHeight;
    }
    const left = frame.x;
    const right = frame.x + frame.width;
    if (left < viewport.scrollLeft) {
      viewport.scrollLeft = left;
    } else if (right > viewport.scrollLeft + viewport.clientWidth) {
      viewport.scrollLeft = right - viewport.clientWidth;
    }
  }, [layout]);

  const beginEdit = useCallback((cell: GridCellAddress, seed?: string, selectAll = true) => {
    if (!isEditableColumn(cell.column)) return;
    const row = rows[cell.row];
    if (!row || !canEdit) return;
    const value = seed ?? valueAtCell(row, cell.column);
    setEditor({ cell, value, selectAll });
    scrollToCell(cell);
  }, [canEdit, rows, scrollToCell]);

  const commitEditor = useCallback((direction?: "down" | "up" | "left" | "right") => {
    if (!editor) return;
    const { cell, value } = editor;
    setCell(cell, value);
    setEditor(null);
    if (!direction) return;
    const next = { ...cell };
    if (direction === "down") next.row += 1;
    if (direction === "up") next.row = Math.max(0, next.row - 1);
    if (direction === "right") next.column = Math.min(layout.columns.length - 1, next.column + 1);
    if (direction === "left") next.column = Math.max(EDITABLE_COL_START, next.column - 1);
    next.column = Math.max(EDITABLE_COL_START, Math.min(EDITABLE_COL_END, next.column));
    if (next.row >= rows.length) {
      setRows((current) => growRows(current, companyId, MOTOR_GRID_EMPTY_ROWS_EXPAND));
    }
    setSelection({
      anchor: next,
      head: next,
      cmdRanges: [],
    });
    scrollToCell(next);
  }, [companyId, editor, layout.columns.length, rows.length, scrollToCell, setCell]);

  const clearRange = useCallback((range: GridRange) => {
    setRows((current) => {
      const next = [...current];
      const mutations: GridMutation[] = [];

      for (let row = range.minRow; row <= range.maxRow; row += 1) {
        for (let column = range.minColumn; column <= range.maxColumn; column += 1) {
          if (!isEditableColumn(column)) continue;
          const rowRef = next[row];
          if (!rowRef) continue;
          const currentValue = valueAtCell(rowRef, column);
          if (!currentValue) continue;
          next[row] = applyCellValue(rowRef, column, "");
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
        setDirtyVersion((version) => version + 1);
        commandBusRef.current.commit("Clear", mutations);
      }

      return next;
    });
  }, []);

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
      setRows((current) => growRows(current, companyId, targetMaxRow - current.length + MOTOR_GRID_EMPTY_ROWS_EXPAND + 1));
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
  }, [companyId, markDirty, rows.length, selection.head]);

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
    if (editor) return;
    const key = event.key;
    const lower = key.toLowerCase();
    const cmd = event.metaKey || event.ctrlKey;
    const shift = event.shiftKey;

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
    if (cmd && lower === "z" && !shift) {
      event.preventDefault();
      commandBusRef.current.undo(applyMutation);
      return;
    }
    if ((cmd && lower === "z" && shift) || (event.ctrlKey && lower === "y")) {
      event.preventDefault();
      commandBusRef.current.redo(applyMutation);
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
          navigableColumns: [1, 2, 3, 4, 5, 6],
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
      setSelection(selectWholeRow(selection.head.row, EDITABLE_COL_START, EDITABLE_COL_END));
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
        setSelection({ anchor: { row: 0, column: EDITABLE_COL_START }, head: { row: 0, column: EDITABLE_COL_START }, cmdRanges: [] });
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
          navigableColumns: [1, 2, 3, 4, 5, 6],
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
            navigableColumns: [1, 2, 3, 4, 5, 6],
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
    applyMutation,
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
    rows,
    selection,
  ]);

  useEffect(() => {
    scrollToCell(selection.head);
  }, [scrollToCell, selection.head]);

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
    const col = Math.min(primary.maxColumn, EDITABLE_COL_END);
    if (!isEditableColumn(col)) return null;
    return { row: primary.maxRow, column: col };
  }, [primary.maxColumn, primary.maxRow]);

  return (
    <div className="animate-autocore-grid-enter relative flex h-full min-h-0 flex-col bg-card">
      <div
        ref={gridRef}
        tabIndex={0}
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
          onMouseDown={() => {
            if (editor) setEditor(null);
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
              className="sticky top-0 z-10 border-b bg-muted"
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
                      setSelection(selectWholeColumn(colIdx, rows.length - 1));
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
                    style={{ height: layout.rowHeight }}
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
                        colIdx === 0
                          ? String(rowIdx + 1)
                          : colIdx === 6
                            ? (row.arrivalDate ? formatMotorDate(row.arrivalDate) : "")
                            : colIdx === 7
                              ? (row.soldDate ? formatMotorDate(row.soldDate) : "")
                              : valueAtCell(row, colIdx);

                      return (
                        <div
                          key={`${row.rowId}-${column.id}`}
                          className={cn(
                            "absolute flex border-r border-b px-2 text-[13px] leading-5 whitespace-nowrap transition-[background-color,box-shadow] duration-150 ease-out motion-reduce:transition-none",
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
                              setSelection(selectWholeRow(rowIdx, EDITABLE_COL_START, EDITABLE_COL_END));
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
                              : selectWholeRow(rowIdx, EDITABLE_COL_START, EDITABLE_COL_END);
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
                          {colIdx === 8 ? (
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
                  value={editor.value}
                  selectAll={editor.selectAll}
                  frame={cellFrame(layout, editor.cell)}
                  onChange={(value) => setEditor((current) => (current ? { ...current, value } : current))}
                  onCommit={(direction) => commitEditor(direction)}
                  onCancel={() => setEditor(null)}
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
        </div>
      ) : null}
    </div>
  );
}
