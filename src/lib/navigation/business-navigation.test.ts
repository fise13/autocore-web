import assert from "node:assert/strict";
import { describe, it } from "node:test";

import {
  buildBusinessNavTree,
  countPrimaryNavItems,
  PRIMARY_BUSINESS_NAV_IDS,
} from "@/lib/navigation/business-navigation";
import type { UserEntity } from "@/domain/user";

function ownerUser(): UserEntity {
  return {
    id: "u1",
    companyId: "c1",
    role: "owner",
    permissions: [
      "inventory_view",
      "inventory_edit",
      "accounting_view",
      "work_orders_view",
      "settings_manage",
    ],
  } as UserEntity;
}

describe("business-navigation", () => {
  it("builds workspace and business sections for owner", () => {
    const tree = buildBusinessNavTree(ownerUser());
    assert.ok(tree.workspace);
    assert.equal(tree.workspace?.label, "Дашборд");
    assert.ok(tree.business.some((item) => item.id === "inventory"));
    assert.ok(tree.business.some((item) => item.id === "sales"));
  });

  it("keeps primary business items within seven entries", () => {
    const tree = buildBusinessNavTree(ownerUser());
    const primaryCount = countPrimaryNavItems(tree.business);
    assert.ok(primaryCount <= PRIMARY_BUSINESS_NAV_IDS.length);
    assert.ok(primaryCount <= 5);
  });

  it("hides inventory for accountant role", () => {
    const accountant = {
      id: "a1",
      companyId: "c1",
      role: "accountant",
      permissions: ["accounting_view"],
    } as UserEntity;
    const tree = buildBusinessNavTree(accountant);
    assert.equal(tree.workspace, null);
    assert.deepEqual(
      tree.business.map((item) => item.id),
      ["accounting", "documents"],
    );
  });
});
