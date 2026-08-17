import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { APPLE_PRODUCT_IDS, planForAppleProduct } from "./apple-config";
import {
  AppleRejectionError,
  acceptedEnvironments,
  assertTransactionUsable,
  billingStatusFor,
  isExpired,
  isIgnorableNotification,
  isTerminalNotification,
  willAutoRenew,
  type AppleTransaction,
} from "./transaction-payload";

const NOW = new Date("2026-08-17T00:00:00Z");
const BUNDLE = "com.wise.autocore.mobile";
const TOKEN = "1b8e0a2c-0000-4000-8000-abcdefabcdef";

function transaction(partial: Partial<AppleTransaction> = {}): AppleTransaction {
  return {
    transactionId: "2000000000000001",
    originalTransactionId: "2000000000000001",
    bundleId: BUNDLE,
    productId: "com.autocore.pro.monthly",
    environment: "Production",
    inAppOwnershipType: "PURCHASED",
    appAccountToken: TOKEN,
    expiresDate: NOW.getTime() + 30 * 24 * 3600 * 1000,
    ...partial,
  };
}

function check(partial: Partial<AppleTransaction> = {}, expectedToken: string | null = TOKEN) {
  assertTransactionUsable({
    transaction: transaction(partial),
    expectedBundleId: BUNDLE,
    expectedAppAccountToken: expectedToken,
    acceptedEnvironments: ["Production", "Sandbox"],
    knownProductIds: APPLE_PRODUCT_IDS,
    now: NOW,
  });
}

function rejectionOf(fn: () => void): string {
  try {
    fn();
  } catch (error) {
    if (error instanceof AppleRejectionError) return error.reason;
    throw error;
  }
  throw new Error("expected a rejection");
}

describe("assertTransactionUsable", () => {
  it("accepts a live, correctly bound purchase", () => {
    assert.doesNotThrow(() => check());
  });

  it("refuses another app's bundle", () => {
    assert.equal(rejectionOf(() => check({ bundleId: "com.someone.else" })), "bundle_mismatch");
  });

  it("refuses a product the server does not sell", () => {
    assert.equal(
      rejectionOf(() => check({ productId: "com.autocore.pro.lifetime" })),
      "signature_invalid",
    );
  });

  it("refuses a transaction bound to a different workspace", () => {
    assert.equal(
      rejectionOf(() => check({ appAccountToken: "99999999-0000-4000-8000-000000000000" })),
      "token_mismatch",
    );
  });

  it("refuses a transaction carrying no token when one was minted", () => {
    assert.equal(rejectionOf(() => check({ appAccountToken: undefined })), "token_mismatch");
  });

  it("matches the token case-insensitively — Apple echoes it uppercased", () => {
    assert.doesNotThrow(() => check({ appAccountToken: TOKEN.toUpperCase() }));
  });

  it("accepts any token when the workspace has never minted one", () => {
    // Restoring a purchase made before the workspace was linked.
    assert.doesNotThrow(() => check({ appAccountToken: "whatever" }, null));
  });

  it("refuses a Family Sharing copy", () => {
    assert.equal(
      rejectionOf(() => check({ inAppOwnershipType: "FAMILY_SHARED" })),
      "token_mismatch",
    );
  });

  it("refuses a refunded transaction even before it expires", () => {
    assert.equal(rejectionOf(() => check({ revocationDate: NOW.getTime() - 1000 })), "revoked");
  });

  it("refuses an expired period", () => {
    assert.equal(rejectionOf(() => check({ expiresDate: NOW.getTime() - 1 })), "expired");
  });

  it("refuses an environment this deployment does not accept", () => {
    assert.throws(
      () =>
        assertTransactionUsable({
          transaction: transaction({ environment: "Sandbox" }),
          expectedBundleId: BUNDLE,
          expectedAppAccountToken: TOKEN,
          acceptedEnvironments: ["Production"],
          knownProductIds: APPLE_PRODUCT_IDS,
          now: NOW,
        }),
      (error: unknown) =>
        error instanceof AppleRejectionError && error.reason === "environment_mismatch",
    );
  });
});

describe("acceptedEnvironments", () => {
  it("accepts sandbox outside production", () => {
    assert.deepEqual(acceptedEnvironments({ nodeEnv: "development", strictProductionOnly: true }), [
      "Sandbox",
      "Production",
    ]);
  });

  it("keeps sandbox in production so TestFlight can buy", () => {
    assert.deepEqual(
      acceptedEnvironments({ nodeEnv: "production", strictProductionOnly: false }),
      ["Sandbox", "Production"],
    );
  });

  it("can be tightened to production only", () => {
    assert.deepEqual(acceptedEnvironments({ nodeEnv: "production", strictProductionOnly: true }), [
      "Production",
    ]);
  });
});

describe("billingStatusFor", () => {
  it("calls an introductory offer a trial", () => {
    assert.equal(billingStatusFor(transaction({ offerType: 1 }), null, NOW), "trialing");
  });

  it("calls a normal live period active", () => {
    assert.equal(billingStatusFor(transaction(), null, NOW), "active");
  });

  it("keeps a lapsed period alive while Apple is still retrying the card", () => {
    const lapsed = transaction({ expiresDate: NOW.getTime() - 1000 });
    assert.equal(billingStatusFor(lapsed, { isInBillingRetryPeriod: true }, NOW), "past_due");
  });

  it("keeps a lapsed period alive inside the grace window", () => {
    const lapsed = transaction({ expiresDate: NOW.getTime() - 1000 });
    const renewal = { gracePeriodExpiresDate: NOW.getTime() + 3600_000 };
    assert.equal(billingStatusFor(lapsed, renewal, NOW), "past_due");
  });

  it("cancels once retries and grace are over", () => {
    const lapsed = transaction({ expiresDate: NOW.getTime() - 1000 });
    assert.equal(billingStatusFor(lapsed, null, NOW), "canceled");
  });

  it("cancels a refund immediately", () => {
    assert.equal(
      billingStatusFor(transaction({ revocationDate: NOW.getTime() }), null, NOW),
      "canceled",
    );
  });
});

describe("renewal flags", () => {
  it("assumes renewal when Apple says nothing", () => {
    assert.equal(willAutoRenew(null), true);
    assert.equal(willAutoRenew({}), true);
  });

  it("reads auto-renew off", () => {
    assert.equal(willAutoRenew({ autoRenewStatus: 0 }), false);
    assert.equal(willAutoRenew({ autoRenewStatus: 1 }), true);
  });
});

describe("notification classification", () => {
  it("treats refunds and revocations as terminal", () => {
    assert.equal(isTerminalNotification("REFUND"), true);
    assert.equal(isTerminalNotification("REVOKE"), true);
    assert.equal(isTerminalNotification("DID_RENEW"), false);
  });

  it("ignores notifications that carry no entitlement change", () => {
    assert.equal(isIgnorableNotification("TEST"), true);
    assert.equal(isIgnorableNotification("CONSUMPTION_REQUEST"), true);
    assert.equal(isIgnorableNotification("DID_RENEW"), false);
  });
});

describe("product catalog", () => {
  it("maps the SKUs the app offers", () => {
    assert.deepEqual(planForAppleProduct("com.autocore.pro.monthly"), {
      planId: "pro_monthly",
      interval: "monthly",
    });
    assert.deepEqual(planForAppleProduct("com.autocore.pro.yearly"), {
      planId: "pro_yearly",
      interval: "yearly",
    });
  });

  it("refuses to map anything else", () => {
    assert.equal(planForAppleProduct("com.autocore.pro.weekly"), null);
    assert.equal(planForAppleProduct(undefined), null);
  });
});

describe("isExpired", () => {
  it("treats a missing expiry as never expiring", () => {
    assert.equal(isExpired({ expiresDate: undefined }, NOW), false);
  });

  it("is inclusive at the boundary", () => {
    assert.equal(isExpired({ expiresDate: NOW.getTime() }, NOW), true);
  });
});
