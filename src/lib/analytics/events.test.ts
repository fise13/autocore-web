import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { purchaseParamsFromCheckout } from "./events";

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
