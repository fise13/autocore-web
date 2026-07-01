import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { MOTOR_SALE_CATEGORY } from "@/lib/accounting/categories";
import {
  operationCategoryDisplayValue,
  operationCategoryLabel,
  resolveOperationCategoryValue,
} from "@/lib/accounting/labels";

describe("accounting category labels", () => {
  it("translates system category keys", () => {
    assert.equal(operationCategoryLabel(MOTOR_SALE_CATEGORY), "Продажа мотора");
    assert.equal(operationCategoryLabel("payroll"), "Зарплата");
  });

  it("keeps custom categories as-is", () => {
    assert.equal(operationCategoryLabel("реклама"), "реклама");
  });

  it("resolves Russian labels back to canonical keys", () => {
    assert.equal(resolveOperationCategoryValue("Продажа мотора"), MOTOR_SALE_CATEGORY);
    assert.equal(operationCategoryDisplayValue(MOTOR_SALE_CATEGORY), "Продажа мотора");
  });
});
