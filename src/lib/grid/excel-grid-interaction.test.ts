import assert from "node:assert/strict";
import { describe, it } from "node:test";

import {
  buildClearWrites,
  buildFillDownWrites,
  buildPasteWrites,
  parseClipboardTsv,
  serializeRangeToTsv,
  serializeRangesToTsv,
} from "./excel-clipboard.ts";
import {
  buildFillOperations,
  resolveFillDragTarget,
  sequenceValue,
} from "./grid-fill-engine.ts";
import {
  isFillDownShortcut,
  isFillRightShortcut,
  isFillWithActiveShortcut,
  isRedoShortcut,
  isUndoShortcut,
} from "./grid-keyboard-shortcuts.ts";
import { allRanges, clickSelection, initialSelection } from "./selection-controller.ts";

describe("excel clipboard", () => {
  it("strips trailing empty line from Excel paste", () => {
    assert.deepEqual(parseClipboardTsv("a\tb\n1\t2\n"), [
      ["a", "b"],
      ["1", "2"],
    ]);
  });

  it("serializes a range as TSV", () => {
    const grid = [
      ["A", "B"],
      ["C", "D"],
    ];
    const text = serializeRangeToTsv(
      { minRow: 0, maxRow: 1, minColumn: 0, maxColumn: 1 },
      (row, column) => grid[row][column],
    );
    assert.equal(text, "A\tB\nC\tD");
  });

  it("serializes multi-range with blank line separator", () => {
    const text = serializeRangesToTsv(
      [
        { minRow: 0, maxRow: 0, minColumn: 0, maxColumn: 0 },
        { minRow: 1, maxRow: 1, minColumn: 1, maxColumn: 1 },
      ],
      (row, column) => `${row}:${column}`,
    );
    assert.equal(text, "0:0\n\n1:1");
  });

  it("tiles paste into a larger selection", () => {
    const { writes, maxRow } = buildPasteWrites({
      matrix: [["x"]],
      selection: { minRow: 0, maxRow: 1, minColumn: 0, maxColumn: 1 },
      isEditableColumn: () => true,
    });
    assert.equal(maxRow, 1);
    assert.equal(writes.length, 4);
    assert.deepEqual(
      writes.map((w) => w.value),
      ["x", "x", "x", "x"],
    );
  });

  it("pastes full matrix from a single-cell selection", () => {
    const { writes, maxRow } = buildPasteWrites({
      matrix: [
        ["a", "b"],
        ["c", "d"],
      ],
      selection: { minRow: 2, maxRow: 2, minColumn: 3, maxColumn: 3 },
      isEditableColumn: () => true,
    });
    assert.equal(maxRow, 3);
    assert.deepEqual(writes, [
      { row: 2, column: 3, value: "a" },
      { row: 2, column: 4, value: "b" },
      { row: 3, column: 3, value: "c" },
      { row: 3, column: 4, value: "d" },
    ]);
  });

  it("builds clear writes for all ranges", () => {
    const writes = buildClearWrites({
      ranges: [
        { minRow: 0, maxRow: 0, minColumn: 0, maxColumn: 1 },
        { minRow: 1, maxRow: 1, minColumn: 0, maxColumn: 0 },
      ],
      valueAt: (row, column) => (row === 0 && column === 1 ? "" : `${row}${column}`),
      isEditableColumn: () => true,
    });
    assert.deepEqual(writes, [
      { row: 0, column: 0, value: "" },
      { row: 1, column: 0, value: "" },
    ]);
  });

  it("builds fill-down writes from the top row", () => {
    const writes = buildFillDownWrites({
      range: { minRow: 0, maxRow: 2, minColumn: 1, maxColumn: 1 },
      valueAt: (row, column) => (row === 0 && column === 1 ? "seed" : ""),
      isEditableColumn: () => true,
    });
    assert.deepEqual(writes, [
      { row: 1, column: 1, value: "seed" },
      { row: 2, column: 1, value: "seed" },
    ]);
  });
});

describe("grid fill engine", () => {
  it("resolves fill drag target in any direction", () => {
    const source = { minRow: 2, maxRow: 3, minColumn: 2, maxColumn: 3 };
    assert.deepEqual(resolveFillDragTarget(source, { row: 0, column: 1 }), {
      minRow: 0,
      maxRow: 3,
      minColumn: 1,
      maxColumn: 3,
    });
  });

  it("fills upward with numeric series", () => {
    const source = { minRow: 2, maxRow: 3, minColumn: 0, maxColumn: 0 };
    const target = { minRow: 0, maxRow: 3, minColumn: 0, maxColumn: 0 };
    const values = ["", "", "10", "20"];
    const ops = buildFillOperations({
      source,
      target,
      valueAt: (cell) => values[cell.row] ?? "",
      isEditableColumn: () => true,
      isDateColumn: () => false,
    });
    assert.deepEqual(ops, [
      { cell: { row: 0, column: 0 }, value: "-10" },
      { cell: { row: 1, column: 0 }, value: "0" },
    ]);
  });

  it("fills left with copy when single source cell", () => {
    const source = { minRow: 0, maxRow: 0, minColumn: 2, maxColumn: 2 };
    const target = { minRow: 0, maxRow: 0, minColumn: 0, maxColumn: 2 };
    const ops = buildFillOperations({
      source,
      target,
      valueAt: (cell) => (cell.column === 2 ? "A" : ""),
      isEditableColumn: () => true,
      isDateColumn: () => false,
    });
    assert.deepEqual(ops, [
      { cell: { row: 0, column: 0 }, value: "A" },
      { cell: { row: 0, column: 1 }, value: "A" },
    ]);
  });

  it("sequenceValue supports negative indices", () => {
    assert.equal(sequenceValue(-1, ["10", "20"], false), "0");
    assert.equal(sequenceValue(2, ["10", "20"], false), "30");
  });
});

describe("grid keyboard shortcuts", () => {
  it("treats meta and ctrl as fill modifiers", () => {
    assert.equal(
      isFillDownShortcut({ metaKey: true, ctrlKey: false, key: "d", shiftKey: false, altKey: false }),
      true,
    );
    assert.equal(
      isFillDownShortcut({ metaKey: false, ctrlKey: true, key: "d", shiftKey: false, altKey: false }),
      true,
    );
    assert.equal(
      isFillRightShortcut({ metaKey: true, ctrlKey: false, key: "r", shiftKey: false, altKey: false }),
      true,
    );
    assert.equal(
      isFillWithActiveShortcut({
        metaKey: true,
        ctrlKey: false,
        key: "Enter",
        shiftKey: false,
        altKey: false,
      }),
      true,
    );
  });

  it("keeps undo/redo matrix", () => {
    assert.equal(
      isUndoShortcut({ metaKey: true, ctrlKey: false, key: "z", shiftKey: false }),
      true,
    );
    assert.equal(
      isRedoShortcut({ metaKey: true, ctrlKey: false, key: "z", shiftKey: true }),
      true,
    );
    assert.equal(
      isRedoShortcut({ metaKey: false, ctrlKey: true, key: "y", shiftKey: false }),
      true,
    );
  });
});

describe("selection multi-range", () => {
  it("allRanges includes primary and cmd ranges", () => {
    let selection = initialSelection();
    selection = clickSelection(selection, { row: 0, column: 1 }, { shift: false, meta: false });
    selection = clickSelection(selection, { row: 2, column: 3 }, { shift: false, meta: true });
    assert.equal(selection.cmdRanges.length, 1);
    assert.deepEqual(selection.cmdRanges[0], {
      minRow: 2,
      maxRow: 2,
      minColumn: 3,
      maxColumn: 3,
    });
    assert.equal(allRanges(selection).length, 2);
  });
});
