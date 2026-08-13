"use client";

import {
  type KeyboardEvent as ReactKeyboardEvent,
  type MutableRefObject,
  useCallback,
  useEffect,
  useRef,
} from "react";

import {
  buildClearWrites,
  buildFillDownWrites,
  buildFillRightWrites,
  buildFillWithActiveWrites,
  buildPasteWrites,
  parseClipboardTsv,
  readClipboardText,
  serializeRangesToTsv,
  writeClipboardText,
} from "@/lib/grid/excel-clipboard";
import {
  createExcelKeyRepeatController,
  isExcelArrowKey,
} from "@/lib/grid/excel-key-repeat";
import {
  boundingDataRange,
  findLastUsedCell,
  jumpColumnInRow,
  jumpRowInColumn,
} from "@/lib/grid/grid-data-region-navigation";
import {
  isFillDownShortcut,
  isFillRightShortcut,
  isFillWithActiveShortcut,
  isFindShortcut,
  isRedoShortcut,
  isUndoShortcut,
} from "@/lib/grid/grid-keyboard-shortcuts";
import { GridCellAddress, GridRange, makeSingleCellRange } from "@/lib/grid/grid-types";
import {
  allRanges,
  GridSelectionState,
  primaryRange,
  selectWholeColumn,
  selectWholeRow,
} from "@/lib/grid/selection-controller";

export type ExcelGridCellWrite = {
  row: number;
  column: number;
  value: string;
};

export type UseExcelGridInteractionParams = {
  canEdit: boolean;
  isEditing: boolean;
  selection: GridSelectionState;
  selectionRef: MutableRefObject<GridSelectionState>;
  setSelection: (
    next: GridSelectionState | ((current: GridSelectionState) => GridSelectionState),
  ) => void;
  rowCount: number;
  columnCount: number;
  editableColumnStart: number;
  editableColumnEnd: number;
  navigableColumns: number[];
  valueAt: (row: number, column: number) => string;
  isEditableColumn: (column: number) => boolean;
  /**
   * Columns Clear/Delete may wipe (defaults to isEditableColumn).
   * Photo cells are clearable but not text-editable.
   */
  isClearableColumn?: (column: number) => boolean;
  mapClearColumn?: (column: number) => number | null;
  applyCellWrites: (label: string, writes: ExcelGridCellWrite[]) => void;
  ensureRowCapacity: (maxRowInclusive: number) => void;
  beginEdit: (cell: GridCellAddress, seed?: string, selectAll?: boolean) => void;
  performUndo: () => void;
  performRedo: () => void;
  scrollByPage: (direction: 1 | -1) => void;
  cmdADoubleTapRef: MutableRefObject<number>;
  /** Return true if the domain handled the key (e.g. warehouse L). */
  onDomainKeyDown?: (event: ReactKeyboardEvent<HTMLDivElement>) => boolean;
  /**
   * When set, wraps Clear/Cut-clear (e.g. confirm before deleting row photos).
   * Call `performClear` to apply the default clear writes.
   */
  interceptClearSelection?: (performClear: () => void) => void;
};

export type ExcelGridInteraction = {
  copySelection: () => Promise<void>;
  cutSelection: () => Promise<void>;
  pasteSelection: () => Promise<void>;
  clearSelection: () => void;
  fillDown: () => void;
  fillRight: () => void;
  fillWithActive: () => void;
  collapseSelectionToActive: () => void;
  handleKeyDown: (event: ReactKeyboardEvent<HTMLDivElement>) => Promise<void>;
  handleKeyUp: (event: ReactKeyboardEvent<HTMLDivElement>) => void;
  handleBlur: () => void;
};

export function useExcelGridInteraction(
  params: UseExcelGridInteractionParams,
): ExcelGridInteraction {
  const {
    canEdit,
    isEditing,
    selection,
    selectionRef,
    setSelection,
    rowCount,
    columnCount,
    editableColumnStart,
    editableColumnEnd,
    navigableColumns,
    valueAt,
    isEditableColumn,
    isClearableColumn,
    mapClearColumn,
    applyCellWrites,
    ensureRowCapacity,
    beginEdit,
    performUndo,
    performRedo,
    scrollByPage,
    cmdADoubleTapRef,
    onDomainKeyDown,
    interceptClearSelection,
  } = params;

  const canClearColumn = isClearableColumn ?? isEditableColumn;

  const isEmpty = useCallback(
    (row: number, column: number) => !valueAt(row, column).trim(),
    [valueAt],
  );

  const keyRepeatRef = useRef(createExcelKeyRepeatController());
  useEffect(() => {
    const controller = keyRepeatRef.current;
    return () => controller.clear();
  }, []);

  useEffect(() => {
    if (isEditing) keyRepeatRef.current.clear();
  }, [isEditing]);

  const copySelection = useCallback(async () => {
    const ranges = allRanges(selectionRef.current);
    const text = serializeRangesToTsv(ranges, valueAt);
    await writeClipboardText(text);
  }, [selectionRef, valueAt]);

  const performClearSelection = useCallback(() => {
    const ranges = allRanges(selectionRef.current);
    const writes = buildClearWrites({
      ranges,
      valueAt,
      isEditableColumn: canClearColumn,
      mapClearColumn,
    });
    applyCellWrites("Clear", writes);
  }, [applyCellWrites, canClearColumn, mapClearColumn, selectionRef, valueAt]);

  const clearSelection = useCallback(() => {
    if (!canEdit) return;
    if (interceptClearSelection) {
      interceptClearSelection(performClearSelection);
      return;
    }
    performClearSelection();
  }, [canEdit, interceptClearSelection, performClearSelection]);

  const cutSelection = useCallback(async () => {
    if (!canEdit) return;
    await copySelection();
    clearSelection();
  }, [canEdit, clearSelection, copySelection]);

  const pasteSelection = useCallback(async () => {
    if (!canEdit) return;
    const clipboard = await readClipboardText();
    if (!clipboard) return;
    const matrix = parseClipboardTsv(clipboard);
    if (matrix.length === 0) return;

    const current = selectionRef.current;
    const range = primaryRange(current);
    const { writes, maxRow } = buildPasteWrites({
      matrix,
      selection: range,
      isEditableColumn,
    });
    ensureRowCapacity(maxRow);
    applyCellWrites("Paste", writes);
  }, [applyCellWrites, canEdit, ensureRowCapacity, isEditableColumn, selectionRef]);

  const fillDown = useCallback(() => {
    if (!canEdit) return;
    const range = primaryRange(selectionRef.current);
    applyCellWrites(
      "Fill Down",
      buildFillDownWrites({ range, valueAt, isEditableColumn }),
    );
  }, [applyCellWrites, canEdit, isEditableColumn, selectionRef, valueAt]);

  const fillRight = useCallback(() => {
    if (!canEdit) return;
    const range = primaryRange(selectionRef.current);
    applyCellWrites(
      "Fill Right",
      buildFillRightWrites({ range, valueAt, isEditableColumn }),
    );
  }, [applyCellWrites, canEdit, isEditableColumn, selectionRef, valueAt]);

  const fillWithActive = useCallback(() => {
    if (!canEdit) return;
    const current = selectionRef.current;
    const range = primaryRange(current);
    applyCellWrites(
      "Ctrl+Enter",
      buildFillWithActiveWrites({
        range,
        active: current.head,
        valueAt,
        isEditableColumn,
      }),
    );
  }, [applyCellWrites, canEdit, isEditableColumn, selectionRef, valueAt]);

  const collapseSelectionToActive = useCallback(() => {
    setSelection((current) => ({
      anchor: current.head,
      head: current.head,
      cmdRanges: [],
    }));
  }, [setSelection]);

  const moveSelectionBy = useCallback(
    (dRow: number, dCol: number, extend: boolean) => {
      setSelection((current) => {
        const head = current.head;
        const nextRow = Math.max(0, head.row + dRow);
        const nextColumn = Math.max(0, Math.min(columnCount - 1, head.column + dCol));
        // Grow empty rows when arrowing past the bottom — Excel keeps going.
        if (nextRow >= rowCount) {
          ensureRowCapacity(nextRow);
        } else if (dRow > 0 && nextRow >= rowCount - 2) {
          ensureRowCapacity(nextRow + 2);
        }
        const next: GridCellAddress = {
          row: nextRow,
          column: nextColumn,
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
    },
    [columnCount, ensureRowCapacity, rowCount, setSelection],
  );

  const stepArrow = useCallback(
    (key: "ArrowUp" | "ArrowDown" | "ArrowLeft" | "ArrowRight", shift: boolean, cmd: boolean) => {
      if (cmd) {
        const head = selectionRef.current.head;
        let targetRow = head.row;
        let targetColumn = head.column;
        if (key === "ArrowLeft" || key === "ArrowRight") {
          targetColumn = jumpColumnInRow({
            row: head.row,
            fromColumn: head.column,
            direction: key === "ArrowRight" ? 1 : -1,
            navigableColumns,
            isEmpty,
          });
        } else {
          targetRow = jumpRowInColumn({
            column: head.column,
            fromRow: head.row,
            direction: key === "ArrowDown" ? 1 : -1,
            rowCount,
            isEmpty,
          });
          if (key === "ArrowDown" && targetRow >= rowCount - 1) {
            ensureRowCapacity(targetRow + 4);
          }
        }
        const target = { row: targetRow, column: targetColumn };
        if (shift) {
          setSelection((current) => ({
            ...current,
            head: target,
            cmdRanges: [],
          }));
        } else {
          setSelection({ anchor: target, head: target, cmdRanges: [] });
        }
        return;
      }
      if (key === "ArrowUp") moveSelectionBy(-1, 0, shift);
      if (key === "ArrowDown") moveSelectionBy(1, 0, shift);
      if (key === "ArrowLeft") moveSelectionBy(0, -1, shift);
      if (key === "ArrowRight") moveSelectionBy(0, 1, shift);
    },
    [
      ensureRowCapacity,
      isEmpty,
      moveSelectionBy,
      navigableColumns,
      rowCount,
      selectionRef,
      setSelection,
    ],
  );

  const handleKeyDown = useCallback(
    async (event: ReactKeyboardEvent<HTMLDivElement>) => {
      const key = event.key;
      const lower = key.toLowerCase();
      const cmd = event.metaKey || event.ctrlKey;
      const shift = event.shiftKey;

      if (isFindShortcut(event)) {
        return;
      }
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

      if (isEditing) return;

      if (onDomainKeyDown?.(event)) {
        return;
      }

      if (cmd && lower === "c") {
        event.preventDefault();
        await copySelection();
        return;
      }
      if (cmd && lower === "x") {
        event.preventDefault();
        await cutSelection();
        return;
      }
      if (cmd && lower === "v") {
        event.preventDefault();
        await pasteSelection();
        return;
      }
      if (isFillWithActiveShortcut(event)) {
        event.preventDefault();
        fillWithActive();
        return;
      }
      if (isFillDownShortcut(event)) {
        event.preventDefault();
        fillDown();
        return;
      }
      if (isFillRightShortcut(event)) {
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
            head: { row: rowCount - 1, column: columnCount - 1 },
            cmdRanges: [],
          });
        } else {
          const range = boundingDataRange({
            rowCount,
            navigableColumns,
            isEmpty,
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
        setSelection(selectWholeColumn(selection.head.column, rowCount - 1));
        return;
      }
      if (event.shiftKey && key === " ") {
        event.preventDefault();
        setSelection(
          selectWholeRow(selection.head.row, editableColumnStart, editableColumnEnd),
        );
        return;
      }
      if (key === "Escape") {
        event.preventDefault();
        collapseSelectionToActive();
        return;
      }
      if (key === "F2") {
        event.preventDefault();
        if (!canEdit) return;
        beginEdit(selection.head, undefined, true);
        return;
      }
      if (key === "Delete" || key === "Backspace") {
        event.preventDefault();
        clearSelection();
        return;
      }
      if (key === "PageDown" || key === "PageUp") {
        event.preventDefault();
        scrollByPage(key === "PageDown" ? 1 : -1);
        return;
      }
      if (key === "Home") {
        event.preventDefault();
        if (cmd) {
          setSelection({
            anchor: { row: 0, column: editableColumnStart },
            head: { row: 0, column: editableColumnStart },
            cmdRanges: [],
          });
        } else {
          setSelection((current) => ({
            ...current,
            anchor: { row: current.head.row, column: 0 },
            head: { row: current.head.row, column: 0 },
            cmdRanges: [],
          }));
        }
        return;
      }
      if (key === "End") {
        event.preventDefault();
        if (cmd) {
          const last = findLastUsedCell({
            rowCount,
            navigableColumns,
            isEmpty,
          });
          const target = last ?? { row: rowCount - 1, column: columnCount - 1 };
          setSelection({ anchor: target, head: target, cmdRanges: [] });
        } else {
          setSelection((current) => ({
            anchor: { row: current.head.row, column: columnCount - 1 },
            head: { row: current.head.row, column: columnCount - 1 },
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
        if (event.repeat) return;
        // ⌘/Ctrl+Arrow jumps to the data edge once — no hold-repeat.
        if (cmd) {
          stepArrow(key, shift, true);
          return;
        }
        const arrow = key;
        const shiftHeld = shift;
        keyRepeatRef.current.onArrowKeyDown(arrow, () => {
          stepArrow(arrow, shiftHeld, false);
        });
        return;
      }
      if (!cmd && !event.altKey && !event.ctrlKey && key.length === 1 && canEdit) {
        event.preventDefault();
        keyRepeatRef.current.clear();
        beginEdit(selection.head, key, false);
      }
    },
    [
      beginEdit,
      canEdit,
      clearSelection,
      collapseSelectionToActive,
      cmdADoubleTapRef,
      columnCount,
      copySelection,
      cutSelection,
      editableColumnEnd,
      editableColumnStart,
      fillDown,
      fillRight,
      fillWithActive,
      isEditing,
      isEmpty,
      moveSelectionBy,
      navigableColumns,
      onDomainKeyDown,
      pasteSelection,
      performRedo,
      performUndo,
      rowCount,
      scrollByPage,
      selection.head,
      setSelection,
      stepArrow,
    ],
  );

  const handleKeyUp = useCallback((event: ReactKeyboardEvent<HTMLDivElement>) => {
    if (isExcelArrowKey(event.key)) {
      keyRepeatRef.current.onArrowKeyUp(event.key);
    }
  }, []);

  const handleBlur = useCallback(() => {
    keyRepeatRef.current.clear();
  }, []);

  return {
    copySelection,
    cutSelection,
    pasteSelection,
    clearSelection,
    fillDown,
    fillRight,
    fillWithActive,
    collapseSelectionToActive,
    handleKeyDown,
    handleKeyUp,
    handleBlur,
  };
}

export function selectionIsSingleCell(selection: GridSelectionState): boolean {
  const range = primaryRange(selection);
  return (
    range.minRow === range.maxRow &&
    range.minColumn === range.maxColumn &&
    selection.cmdRanges.length === 0
  );
}

export function singleCellRangeFromSelection(selection: GridSelectionState): GridRange {
  return makeSingleCellRange(selection.head);
}
