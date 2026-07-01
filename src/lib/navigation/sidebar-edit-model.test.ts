import assert from "node:assert/strict";
import { describe, it } from "node:test";

import {
  DEFAULT_SIDEBAR_CUSTOMIZATION,
  normalizeSidebarCustomization,
} from "@/lib/navigation/sidebar-customization";
import {
  getDisabledNavItems,
  isCollectionNavEnabled,
  setNavItemEnabled,
} from "@/lib/navigation/sidebar-edit-model";

describe("sidebar-edit-model", () => {
  it("tracks disabled nav items for restore pool", () => {
    const customization = setNavItemEnabled(
      normalizeSidebarCustomization(DEFAULT_SIDEBAR_CUSTOMIZATION),
      "warehouse",
      false,
    );

    assert.deepEqual(getDisabledNavItems(customization, ["warehouse", "motors"]), ["warehouse"]);
    assert.equal(isCollectionNavEnabled(customization, "consumables"), false);
    assert.equal(isCollectionNavEnabled(customization, "engines"), true);
  });
});
