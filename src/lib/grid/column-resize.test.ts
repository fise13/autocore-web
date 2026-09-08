import assert from "node:assert/strict";
import test from "node:test";

import {
  applyColumnWidthOverrides,
  clampExcelColumnWidth,
  MIN_EXCEL_COLUMN_WIDTH,
} from "@/lib/grid/column-resize";

test("clampExcelColumnWidth floors at the Excel minimum", () => {
  assert.equal(clampExcelColumnWidth(12), MIN_EXCEL_COLUMN_WIDTH);
  assert.equal(clampExcelColumnWidth(80.4), 80);
});

test("clampExcelColumnWidth also caps at the Excel maximum", () => {
  assert.equal(clampExcelColumnWidth(4000), 1400);
});

test("applyColumnWidthOverrides updates one column and rebuilds offsets", () => {
  const layout = {
    columns: [
      { id: "a", width: 80 },
      { id: "b", width: 120 },
    ],
    xOffsets: [0, 80],
    totalWidth: 200,
  };

  const next = applyColumnWidthOverrides(layout, { b: 200 });
  assert.equal(next.columns[1]?.width, 200);
  assert.deepEqual(next.xOffsets, [0, 80]);
  assert.equal(next.totalWidth, 280);
  assert.equal(layout.totalWidth, 200);
});

test("applyColumnWidthOverrides is a no-op when overrides miss every column", () => {
  const layout = {
    columns: [{ id: "a", width: 80 }],
    xOffsets: [0],
    totalWidth: 80,
  };
  assert.equal(applyColumnWidthOverrides(layout, { missing: 140 }), layout);
});
