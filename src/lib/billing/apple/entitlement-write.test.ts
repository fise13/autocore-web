import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { decideEntitlementWrite, type EntitlementWriteInput } from "./entitlement-write";
import { AppleRejectionError, type AppleTransaction } from "./transaction-payload";

const NOW = new Date("2026-08-21T12:00:00.000Z");
const MONTH_MS = 30 * 24 * 60 * 60 * 1000;

function transaction(overrides: Partial<AppleTransaction> = {}): AppleTransaction {
  return {
    transactionId: "2000000900000001",
    originalTransactionId: "2000000800000001",
    bundleId: "com.wise.autocore.mobile",
    productId: "com.autocore.pro.monthly",
    environment: "Production",
    inAppOwnershipType: "PURCHASED",
    purchaseDate: NOW.getTime(),
    expiresDate: NOW.getTime() + MONTH_MS,
    ...overrides,
  };
}

function input(overrides: Partial<EntitlementWriteInput> = {}): EntitlementWriteInput {
  return {
    companyId: "company-a",
    transaction: transaction(),
    renewal: null,
    boundCompanyId: null,
    storedPeriodEndMs: null,
    storedOriginalTransactionId: null,
    storedProActive: false,
    allowTransfer: false,
    now: NOW,
    ...overrides,
  };
}

describe("decideEntitlementWrite — ownership", () => {
  it("writes Pro for a first purchase with no prior binding", () => {
    const decision = decideEntitlementWrite(input());
    assert.equal(decision.kind, "write");
    assert.ok(decision.kind === "write");
    assert.equal(decision.document.proActive, true);
    assert.equal(decision.document.plan, "pro");
    assert.equal(decision.document.provider, "apple");
    assert.equal(decision.transferFrom, null);
    assert.equal(decision.planId, "pro_monthly");
  });

  it("re-applying the same transaction to the same company is a plain write", () => {
    const decision = decideEntitlementWrite(
      input({
        boundCompanyId: "company-a",
        storedOriginalTransactionId: "2000000800000001",
        storedPeriodEndMs: NOW.getTime() + MONTH_MS,
        storedProActive: true,
      }),
    );
    assert.ok(decision.kind === "write");
    assert.equal(decision.transferFrom, null);
    assert.equal(decision.document.proActive, true);
  });

  it("refuses a subscription already bound to another workspace", () => {
    assert.throws(
      () => decideEntitlementWrite(input({ boundCompanyId: "company-b" })),
      (error: unknown) =>
        error instanceof AppleRejectionError && error.reason === "bound_to_other_company",
    );
  });

  it("moves the subscription and names the workspace to revoke when transfer is asked for", () => {
    const decision = decideEntitlementWrite(
      input({ boundCompanyId: "company-b", allowTransfer: true }),
    );
    assert.ok(decision.kind === "write");
    assert.equal(decision.transferFrom, "company-b");
    assert.equal(decision.document.proActive, true);
  });
});

describe("decideEntitlementWrite — ordering", () => {
  it("ignores an older transaction for a subscription whose stored term ends later", () => {
    const decision = decideEntitlementWrite(
      input({
        transaction: transaction({ expiresDate: NOW.getTime() + MONTH_MS }),
        storedOriginalTransactionId: "2000000800000001",
        storedPeriodEndMs: NOW.getTime() + 3 * MONTH_MS,
        storedProActive: true,
      }),
    );
    assert.equal(decision.kind, "skip_stale");
    assert.ok(decision.kind === "skip_stale");
    assert.equal(decision.proActive, true);
  });

  it("applies a renewal that extends the term", () => {
    const decision = decideEntitlementWrite(
      input({
        transaction: transaction({ expiresDate: NOW.getTime() + 2 * MONTH_MS }),
        storedOriginalTransactionId: "2000000800000001",
        storedPeriodEndMs: NOW.getTime() + MONTH_MS,
        storedProActive: true,
      }),
    );
    assert.ok(decision.kind === "write");
    assert.equal(
      decision.document.currentPeriodEnd?.getTime(),
      NOW.getTime() + 2 * MONTH_MS,
    );
  });

  it("never lets the stale guard hold back a refund", () => {
    const decision = decideEntitlementWrite(
      input({
        transaction: transaction({
          expiresDate: NOW.getTime() + MONTH_MS,
          revocationDate: NOW.getTime(),
        }),
        storedOriginalTransactionId: "2000000800000001",
        storedPeriodEndMs: NOW.getTime() + 3 * MONTH_MS,
        storedProActive: true,
      }),
    );
    assert.ok(decision.kind === "write");
    assert.equal(decision.document.proActive, false);
    assert.equal(decision.document.revoked, true);
    assert.equal(decision.document.plan, "free");
  });

  it("a different subscription is not compared against the stored term", () => {
    const decision = decideEntitlementWrite(
      input({
        transaction: transaction({
          originalTransactionId: "2000000800000999",
          expiresDate: NOW.getTime() + MONTH_MS,
        }),
        storedOriginalTransactionId: "2000000800000001",
        storedPeriodEndMs: NOW.getTime() + 3 * MONTH_MS,
        storedProActive: true,
      }),
    );
    assert.ok(decision.kind === "write");
  });
});

describe("decideEntitlementWrite — expiry and plan", () => {
  it("writes free for a term that has already ended", () => {
    const decision = decideEntitlementWrite(
      input({ transaction: transaction({ expiresDate: NOW.getTime() - 1 }) }),
    );
    assert.ok(decision.kind === "write");
    assert.equal(decision.document.proActive, false);
    assert.equal(decision.document.plan, "free");
    assert.equal(decision.document.status, "canceled");
  });

  it("keeps a lapsed term Pro while Apple is still retrying the payment", () => {
    const decision = decideEntitlementWrite(
      input({
        transaction: transaction({ expiresDate: NOW.getTime() - 1 }),
        renewal: { isInBillingRetryPeriod: true },
      }),
    );
    assert.ok(decision.kind === "write");
    assert.equal(decision.document.status, "past_due");
  });

  it("marks a StoreKit introductory offer as trialing", () => {
    const decision = decideEntitlementWrite(
      input({ transaction: transaction({ offerType: 1 }) }),
    );
    assert.ok(decision.kind === "write");
    assert.equal(decision.document.status, "trialing");
  });

  it("carries the yearly interval through to the document", () => {
    const decision = decideEntitlementWrite(
      input({ transaction: transaction({ productId: "com.autocore.pro.yearly" }) }),
    );
    assert.ok(decision.kind === "write");
    assert.equal(decision.document.billingInterval, "yearly");
    assert.equal(decision.planId, "pro_yearly");
  });

  it("reports auto-renew off when Apple says the user cancelled", () => {
    const decision = decideEntitlementWrite(
      input({ renewal: { autoRenewStatus: 0 } }),
    );
    assert.ok(decision.kind === "write");
    assert.equal(decision.document.willAutoRenew, false);
    // Still entitled until the paid term ends.
    assert.equal(decision.document.proActive, true);
  });
});
