import assert from "node:assert/strict";
import { describe, it } from "node:test";

import {
  itemMatchesLocationFilter,
  collectLocationFilterOptions,
  countUnlocatedItems,
} from "@/lib/warehouse/warehouse-location-filter";

describe("warehouse location filter", () => {
  const items = [
    { warehouseLocation: "A-12" },
    { primaryLocationCode: "A-12" },
    { warehouseLocation: "B-04" },
    {},
    { warehouseLocation: "" },
  ];

  it("matches unlocated and code filters", () => {
    assert.equal(countUnlocatedItems(items), 2);
    assert.equal(
      items.filter((item) => itemMatchesLocationFilter(item, { kind: "unlocated" })).length,
      2,
    );
    assert.equal(
      items.filter((item) => itemMatchesLocationFilter(item, { kind: "code", code: "A-12" })).length,
      2,
    );
  });

  it("collects top location options", () => {
    const options = collectLocationFilterOptions(items);
    assert.equal(options[0]?.code, "A-12");
    assert.equal(options[0]?.count, 2);
  });
});
