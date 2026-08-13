import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { createEmptyRow } from "@/lib/grid/grid-data-store";
import { planPhotoClearOnClear } from "@/lib/grid/plan-photo-clear-on-clear";

describe("planPhotoClearOnClear", () => {
  it("asks to clear photos when clear would leave only media", () => {
    const row = {
      ...createEmptyRow("c1"),
      serialCode: "ABC",
      photoUrls: ["https://example.com/a.jpg", "https://example.com/b.jpg"],
    };
    const plan = planPhotoClearOnClear({
      ranges: [{ minRow: 0, maxRow: 0, minColumn: 0, maxColumn: 0 }],
      rows: [row],
      isEditableColumn: (column) => column === 0,
      applyClearedValue: (current) => ({ ...current, serialCode: "" }),
    });
    assert.equal(plan.photoCount, 2);
    assert.deepEqual(plan.rowIndexes, [0]);
  });

  it("skips photo clear when other fields remain", () => {
    const row = {
      ...createEmptyRow("c1"),
      serialCode: "ABC",
      brandName: "Toyota",
      photoUrls: ["https://example.com/a.jpg"],
    };
    const plan = planPhotoClearOnClear({
      ranges: [{ minRow: 0, maxRow: 0, minColumn: 0, maxColumn: 0 }],
      rows: [row],
      isEditableColumn: (column) => column === 0,
      applyClearedValue: (current) => ({ ...current, serialCode: "" }),
    });
    assert.equal(plan.photoCount, 0);
    assert.deepEqual(plan.rowIndexes, []);
  });

  it("covers photo-only rows even when clear writes are empty", () => {
    const row = {
      ...createEmptyRow("c1"),
      photoUrls: ["https://example.com/a.jpg"],
    };
    const plan = planPhotoClearOnClear({
      ranges: [{ minRow: 0, maxRow: 0, minColumn: 0, maxColumn: 0 }],
      rows: [row],
      isEditableColumn: () => true,
      applyClearedValue: (current) => current,
    });
    assert.equal(plan.photoCount, 1);
  });
});
