import assert from "node:assert/strict";
import { describe, it } from "node:test";

import {
  googleAdsSubscriptionConversionParams,
  isSubscriptionThankYou,
  pageViewParamsFrom,
  purchaseParamsFromCheckout,
} from "./events";
import { PRODUCTION_GOOGLE_ADS_SUBSCRIPTION_SEND_TO } from "./ga-config";

describe("purchaseParamsFromCheckout", () => {
  it("keeps the plan interval when Paddle sent nothing else", () => {
    assert.deepEqual(purchaseParamsFromCheckout(null, "yearly"), { interval: "yearly" });
  });

  it("reads snake_case checkout fields without customer identity", () => {
    assert.deepEqual(
      purchaseParamsFromCheckout(
        {
          transaction_id: " txn_01abc ",
          currency_code: "USD",
          totals: { total: "29.00" },
          customer: { email: "not-for-google@example.com" },
        },
        "monthly",
      ),
      {
        interval: "monthly",
        transaction_id: "txn_01abc",
        currency: "USD",
        value: 29,
      },
    );
  });

  it("accepts camelCase aliases from the Paddle.js payload", () => {
    assert.deepEqual(
      purchaseParamsFromCheckout(
        { transactionId: "txn_01def", currencyCode: "EUR", totals: { total: 49 } },
        null,
      ),
      { transaction_id: "txn_01def", currency: "EUR", value: 49 },
    );
  });
});

describe("googleAdsSubscriptionConversionParams", () => {
  it("always sends the Ads conversion id", () => {
    assert.deepEqual(
      googleAdsSubscriptionConversionParams({}, PRODUCTION_GOOGLE_ADS_SUBSCRIPTION_SEND_TO),
      { send_to: PRODUCTION_GOOGLE_ADS_SUBSCRIPTION_SEND_TO },
    );
  });

  it("forwards money and the opaque transaction id when Paddle had them", () => {
    assert.deepEqual(
      googleAdsSubscriptionConversionParams(
        { interval: "yearly", value: 29, currency: "USD", transaction_id: "txn_01abc" },
        PRODUCTION_GOOGLE_ADS_SUBSCRIPTION_SEND_TO,
      ),
      {
        send_to: PRODUCTION_GOOGLE_ADS_SUBSCRIPTION_SEND_TO,
        value: 29,
        currency: "USD",
        transaction_id: "txn_01abc",
      },
    );
  });
});

describe("isSubscriptionThankYou", () => {
  it("matches the welcome page and checkout success query", () => {
    assert.equal(isSubscriptionThankYou("/welcome", null), true);
    assert.equal(isSubscriptionThankYou("/welcome/", null), true);
    assert.equal(isSubscriptionThankYou("/settings", "success"), true);
    assert.equal(isSubscriptionThankYou("/settings", "canceled"), false);
    assert.equal(isSubscriptionThankYou("/pricing", null), false);
  });
});

describe("pageViewParamsFrom", () => {
  it("keeps a clean page_path so gclid does not explode the path report", () => {
    assert.deepEqual(
      pageViewParamsFrom("https://myautocore.com/pricing?gclid=abc", "Pricing"),
      {
        page_title: "Pricing",
        page_location: "https://myautocore.com/pricing?gclid=abc",
        page_path: "/pricing",
      },
    );
  });
});
