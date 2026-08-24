import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { stocktakeDifference } from "@/domain/stocktake";
import { listingStatusForPart } from "@/domain/marketplace-listing";

describe("stocktakeDifference", () => {
  it("is counted minus expected", () => {
    assert.equal(stocktakeDifference({ itemId: "i", sku: "s", name: "n", expectedQty: 4, countedQty: 3 }), -1);
    assert.equal(stocktakeDifference({ itemId: "i", sku: "s", name: "n", expectedQty: 4, countedQty: 6 }), 2);
  });
});

describe("listingStatusForPart", () => {
  it("delists sold and scrapped parts", () => {
    assert.equal(listingStatusForPart("sold"), "sold");
    assert.equal(listingStatusForPart("reserved"), "reserved");
    assert.equal(listingStatusForPart("scrapped"), "delisted");
    assert.equal(listingStatusForPart("available"), "listed");
  });
});
