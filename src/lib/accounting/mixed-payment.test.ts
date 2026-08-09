import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { calculateCashBalanceUseCase } from "@/application/use-cases/calculate-cash-balance";
import type { FinancialOperation } from "@/domain/financial-operation";
import {
  buildMixedPaymentFields,
  defaultMixedSplit,
  isValidMixedSplit,
  mixedCashPortion,
  splitFromCashPortion,
} from "@/lib/accounting/mixed-payment";

function op(
  overrides: Partial<FinancialOperation> &
    Pick<FinancialOperation, "id" | "type" | "amount" | "account" | "paymentMethod">,
): FinancialOperation {
  return {
    companyId: "c1",
    createdAt: new Date("2026-08-01T10:00:00"),
    createdByUserId: "u1",
    ...overrides,
  };
}

describe("mixed payment", () => {
  it("splits evenly with remainder on transfer", () => {
    assert.deepEqual(defaultMixedSplit(100), { cash: 50, transfer: 50 });
    assert.deepEqual(defaultMixedSplit(101), { cash: 50.5, transfer: 50.5 });
    assert.deepEqual(splitFromCashPortion(100, 30), { cash: 30, transfer: 70 });
    assert.equal(isValidMixedSplit(100, 30), true);
    assert.equal(isValidMixedSplit(100, 0), false);
    assert.equal(isValidMixedSplit(100, 100), false);
  });

  it("builds payload fields for mixed and single methods", () => {
    assert.deepEqual(buildMixedPaymentFields("cash", "kaspi", 100, null), {
      paymentMethod: "cash",
      account: "cashbox",
      cashReceived: null,
    });
    assert.deepEqual(buildMixedPaymentFields("mixed", "cashbox", 100, 40), {
      paymentMethod: "mixed",
      account: "kaspi",
      cashReceived: 40,
    });
  });

  it("splits mixed operations across cashbox and kaspi balances", () => {
    const snapshot = calculateCashBalanceUseCase([
      op({
        id: "1",
        type: "sale",
        amount: 100,
        account: "kaspi",
        paymentMethod: "mixed",
        cashReceived: 40,
      }),
      op({
        id: "2",
        type: "expense",
        amount: 20,
        account: "cashbox",
        paymentMethod: "cash",
      }),
    ]);
    assert.equal(snapshot.cashbox, 20);
    assert.equal(snapshot.kaspi, 60);
    assert.equal(snapshot.total, 80);
  });

  it("keeps legacy mixed rows on a single account", () => {
    const operation = op({
      id: "legacy",
      type: "sale",
      amount: 50,
      account: "cashbox",
      paymentMethod: "mixed",
    });
    assert.equal(mixedCashPortion(operation), null);
    const snapshot = calculateCashBalanceUseCase([operation]);
    assert.equal(snapshot.cashbox, 50);
    assert.equal(snapshot.kaspi, 0);
  });
});
