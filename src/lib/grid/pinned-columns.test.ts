import assert from "node:assert/strict";
import { describe, it } from "node:test";

import {
  pinnedColumnMetrics,
  stickyColumnLeft,
  unionVisibleColumnIndexes,
} from "@/lib/grid/pinned-columns";

describe("pinned columns", () => {
  it("computes cumulative left offsets for the first three engine columns", () => {
    const columns = [
      { id: "rowNumber", width: 44 },
      { id: "brandName", width: 100 },
      { id: "engineCode", width: 110 },
      { id: "serialCode", width: 130 },
    ];
    const pinned = pinnedColumnMetrics(columns, ["rowNumber", "brandName", "engineCode"]);
    assert.deepEqual(pinned.indexes, [0, 1, 2]);
    assert.equal(pinned.lefts.get(0), 0);
    assert.equal(pinned.lefts.get(1), 44);
    assert.equal(pinned.lefts.get(2), 144);
    assert.equal(pinned.lastIndex, 2);
    assert.equal(pinned.totalWidth, 254);
  });

  it("skips a hidden brand column", () => {
    const columns = [
      { id: "rowNumber", width: 44 },
      { id: "engineCode", width: 110 },
      { id: "serialCode", width: 130 },
    ];
    const pinned = pinnedColumnMetrics(columns, ["rowNumber", "brandName", "engineCode"]);
    assert.deepEqual(pinned.indexes, [0, 1]);
    assert.equal(pinned.lefts.get(1), 44);
  });

  it("always includes pinned indexes in the virtualized column set", () => {
    assert.deepEqual(unionVisibleColumnIndexes(5, 8, [0, 1, 2], 14), [0, 1, 2, 5, 6, 7, 8]);
  });

  it("shifts pinned cells with horizontal scroll", () => {
    assert.equal(stickyColumnLeft(2, 144, 220, 144), 364);
    assert.equal(stickyColumnLeft(5, 640, 220, undefined), 640);
  });
});
