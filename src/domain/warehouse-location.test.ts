import assert from "node:assert/strict";
import { describe, it } from "node:test";

import {
  buildLocationDisplayCode,
  isUnlocatedLocation,
  UNLOCATED_LOCATION_CODE,
  unlocatedLocationDocId,
} from "@/domain/warehouse-location";
import { resolveItemLocationLabel } from "@/lib/warehouse/resolve-item-location-label";

describe("warehouse locations domain", () => {
  it("builds display codes from path segments", () => {
    assert.equal(buildLocationDisplayCode(["A", "03", "B", "12"]), "A-03-B-12");
    assert.equal(buildLocationDisplayCode(["Engine Yard"]), "Engine Yard");
  });

  it("identifies unlocated system leaf", () => {
    assert.equal(isUnlocatedLocation({ code: UNLOCATED_LOCATION_CODE, isSystem: true }), true);
    assert.equal(unlocatedLocationDocId("wh_1"), "unlocated_wh_1");
  });

  it("dual-reads primary over legacy warehouseLocation", () => {
    assert.equal(
      resolveItemLocationLabel({
        primaryLocationCode: "A-12",
        warehouseLocation: "OLD",
      }),
      "A-12",
    );
    assert.equal(
      resolveItemLocationLabel({
        warehouseLocation: "B-04",
      }),
      "B-04",
    );
  });
});
