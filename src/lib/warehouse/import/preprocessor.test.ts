import assert from "node:assert/strict";
import { describe, it } from "node:test";

import {
  cleanCell,
  dedupeHeaders,
  parseNumeric,
  parseQuantity,
  preprocessRows,
} from "./preprocessor.ts";

describe("import preprocessor", () => {
  it("cleans NBSP and zero-width characters", () => {
    assert.equal(cleanCell(" Toyota\u00A0Oil\u200B "), "Toyota Oil");
  });

  it("parses RU decimal numbers", () => {
    assert.equal(parseNumeric("1 234,56 ₽"), 1234.56);
    assert.equal(parseQuantity("10"), 10);
  });

  it("deduplicates repeated headers", () => {
    assert.deepEqual(dedupeHeaders(["Qty", "Name", "Qty"]), ["Qty", "Name", "Qty_2"]);
  });

  it("flags duplicate rows in file", () => {
    const result = preprocessRows([
      { sku: "A1", name: "Oil" },
      { sku: "A1", name: "Oil" },
      { sku: "B2", name: "Filter" },
    ]);
    assert.equal(result.rows.length, 3);
    assert.equal(result.duplicateRowIndexes.size, 1);
  });
});
