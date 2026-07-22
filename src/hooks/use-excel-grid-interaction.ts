"use client";

import {
  type KeyboardEvent as ReactKeyboardEvent,
  type MutableRefObject,
  useCallback,
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
    mapClearColumn,
    applyCellWrites,
    ensureRowCapacity,
    beginEdit,
    performUndo,
    performRedo,
    scrollByPage,
    cmdADoubleTapRef,
    onDomainKeyDown,
  } = params;

  const isEmpty = useCallback(
    (row: number, column: number) => !valueAt(row, column).trim(),
    [valueAt],
  );

  const copySelection = useCallback(async () => {
    const ranges = allRanges(selectionRef.current);
    const text = serializeRangesToTsv(ranges, valueAt);
    await writeClipboardText(text);
  }, [selectionRef, valueAt]);

  const clearSelection = useCallback(() => {
    if (!canEdit) return;
    const ranges = allRanges(selectionRef.current);
    const writes = buildClearWrites({
      ranges,
      valueAt,
      isEditableColumn,
      mapClearColumn,
    });
    applyCellWrites("Clear", writes);
  }, [applyCellWrites, canEdit, isEditableColumn, mapClearColumn, selectionRef, valueAt]);

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
        const next: GridCellAddress = {
          row: Math.max(0, Math.min(rowCount - 1, head.row + dRow)),
          column: Math.max(0, Math.min(columnCount - 1, head.column + dCol)),
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
    [columnCount, rowCount, setSelection],
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
        if (cmd) {
          const head = selection.head;
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
        return;
      }
      if (!cmd && !event.altKey && !event.ctrlKey && key.length === 1 && canEdit) {
        event.preventDefault();
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
    ],
  );

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
