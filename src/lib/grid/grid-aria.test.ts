import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { gridAriaColIndex, gridAriaRowIndex, gridCellDomId } from "@/lib/grid/grid-aria";

describe("grid aria helpers", () => {
  it("reserves aria row 1 for the header row", () => {
    assert.equal(gridAriaRowIndex(0), 2);
    assert.equal(gridAriaRowIndex(41), 43);
  });

  it("uses 1-based column indexes", () => {
    assert.equal(gridAriaColIndex(0), 1);
  });

  it("builds a stable, unique id per cell", () => {
    assert.equal(gridCellDomId(":r1:", 3, 4), ":r1:-r3-c4");
    assert.notEqual(gridCellDomId("g", 1, 23), gridCellDomId("g", 12, 3));
  });
});
