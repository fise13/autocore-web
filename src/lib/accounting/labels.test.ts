import assert from "node:assert/strict";
import { afterEach, describe, it } from "node:test";

import { MOTOR_SALE_CATEGORY } from "@/lib/accounting/categories";
import {
  operationCategoryDisplayValue,
  operationCategoryLabel,
  resolveOperationCategoryValue,
} from "@/lib/accounting/labels";
import { getActiveUserCopyLocale, setActiveUserCopyLocale } from "@/lib/user-copy";

/**
 * These assertions are locale-dependent, so each one pins the locale rather
 * than inheriting whatever the app default happens to be — the suite used to
 * pass only because the default was `ru`.
 */
const initialLocale = getActiveUserCopyLocale();

afterEach(() => {
  setActiveUserCopyLocale(initialLocale);
});

describe("accounting category labels", () => {
  it("translates system category keys", () => {
    setActiveUserCopyLocale("ru");
    assert.equal(operationCategoryLabel(MOTOR_SALE_CATEGORY), "Продажа мотора");
    assert.equal(operationCategoryLabel("payroll"), "Зарплата");

    setActiveUserCopyLocale("en");
    assert.equal(operationCategoryLabel(MOTOR_SALE_CATEGORY), "Motor sale");
    assert.equal(operationCategoryLabel("payroll"), "Payroll");
  });

  it("keeps custom categories as-is", () => {
    setActiveUserCopyLocale("ru");
    assert.equal(operationCategoryLabel("канцтовары"), "канцтовары");

    setActiveUserCopyLocale("en");
    assert.equal(operationCategoryLabel("office supplies"), "office supplies");
  });

  it("translates suggestion category keys", () => {
    setActiveUserCopyLocale("en");
    assert.equal(operationCategoryLabel("advertising"), "Advertising");

    setActiveUserCopyLocale("ru");
    assert.equal(operationCategoryLabel("advertising"), "Реклама");
  });

  it("resolves labels from either locale back to canonical keys", () => {
    setActiveUserCopyLocale("en");
    // The reverse lookup spans both bundles, so Russian input still resolves
    // while the UI is locked to English.
    assert.equal(resolveOperationCategoryValue("Продажа мотора"), MOTOR_SALE_CATEGORY);
    assert.equal(resolveOperationCategoryValue("Motor sale"), MOTOR_SALE_CATEGORY);
    assert.equal(operationCategoryDisplayValue(MOTOR_SALE_CATEGORY), "Motor sale");

    setActiveUserCopyLocale("ru");
    assert.equal(operationCategoryDisplayValue(MOTOR_SALE_CATEGORY), "Продажа мотора");
  });
});
