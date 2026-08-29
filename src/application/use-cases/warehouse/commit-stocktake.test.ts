import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { stocktakeDifference } from "@/domain/stocktake";

describe("stocktakeDifference", () => {
  it("is counted minus expected", () => {
    assert.equal(stocktakeDifference({ itemId: "i", sku: "s", name: "n", expectedQty: 4, countedQty: 3 }), -1);
    assert.equal(stocktakeDifference({ itemId: "i", sku: "s", name: "n", expectedQty: 4, countedQty: 6 }), 2);
  });
});
