import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { applyRowDefaults, buildGridRows, createEmptyRow } from "@/lib/grid/grid-data-store";

describe("grid filler rows", () => {
  it("stay blank so a brand filter never paints every row", () => {
    const rows = buildGridRows([], "c1");
    assert.ok(rows.length > 0);
    assert.ok(rows.every((row) => row.brandName === "" && row.engineCode === ""));
  });

  it("take the filter's brand/model only where the user left them blank", () => {
    const filter = { brandName: "Chevrolet", engineCode: "10HMC" };
    const blank = { ...createEmptyRow("c1"), serialCode: "H1" };
    assert.deepEqual(
      [applyRowDefaults(blank, filter).brandName, applyRowDefaults(blank, filter).engineCode],
      ["Chevrolet", "10HMC"],
    );

    const typed = { ...blank, engineCode: "F16D4" };
    assert.equal(applyRowDefaults(typed, filter).engineCode, "F16D4");
    assert.equal(applyRowDefaults(blank, undefined), blank);
  });
});
