import assert from "node:assert/strict";
import { createHmac } from "node:crypto";
import { describe, it } from "node:test";

import {
  SIGNATURE_TOLERANCE_SEC,
  signStripePayload,
  verifyStripeSignature,
} from "./stripe-signature";

/**
 * The webhook is a public, unauthenticated URL that writes the billing
 * collection. Signature verification is the entire access control story, so
 * these tests cover the ways it can wrongly say yes.
 */

const SECRET = "whsec_test_secret_value";
const NOW = 1_760_000_000;
const BODY = Buffer.from(
  JSON.stringify({ id: "evt_1", type: "customer.subscription.deleted" }),
  "utf8",
);

function header(overrides?: { timestampSec?: number; secret?: string }) {
  return signStripePayload({
    rawBody: BODY,
    secret: overrides?.secret ?? SECRET,
    timestampSec: overrides?.timestampSec ?? NOW,
  });
}

describe("verifyStripeSignature", () => {
  it("accepts a correctly signed payload", () => {
    assert.equal(
      verifyStripeSignature({
        rawBody: BODY,
        signatureHeader: header(),
        secret: SECRET,
        nowSec: NOW,
      }),
      true,
    );
  });

  it("rejects a payload signed with a different secret", () => {
    assert.equal(
      verifyStripeSignature({
        rawBody: BODY,
        signatureHeader: header({ secret: "whsec_attacker" }),
        secret: SECRET,
        nowSec: NOW,
      }),
      false,
    );
  });

  it("rejects a body modified after signing", () => {
    const tampered = Buffer.from(
      JSON.stringify({ id: "evt_1", type: "customer.subscription.created" }),
      "utf8",
    );
    assert.equal(
      verifyStripeSignature({
        rawBody: tampered,
        signatureHeader: header(),
        secret: SECRET,
        nowSec: NOW,
      }),
      false,
    );
  });

  it("rejects a replayed payload beyond the tolerance window", () => {
    assert.equal(
      verifyStripeSignature({
        rawBody: BODY,
        signatureHeader: header(),
        secret: SECRET,
        nowSec: NOW + SIGNATURE_TOLERANCE_SEC + 1,
      }),
      false,
    );
  });

  it("accepts a payload inside the tolerance window", () => {
    assert.equal(
      verifyStripeSignature({
        rawBody: BODY,
        signatureHeader: header(),
        secret: SECRET,
        nowSec: NOW + SIGNATURE_TOLERANCE_SEC - 1,
      }),
      true,
    );
  });

  it("rejects a future-dated payload beyond tolerance", () => {
    assert.equal(
      verifyStripeSignature({
        rawBody: BODY,
        signatureHeader: header({ timestampSec: NOW + 10_000 }),
        secret: SECRET,
        nowSec: NOW,
      }),
      false,
    );
  });

  it("rejects a header with no v1 signature", () => {
    assert.equal(
      verifyStripeSignature({
        rawBody: BODY,
        signatureHeader: `t=${NOW}`,
        secret: SECRET,
        nowSec: NOW,
      }),
      false,
    );
  });

  it("rejects a header with no timestamp", () => {
    const signature = createHmac("sha256", SECRET).update(BODY).digest("hex");
    assert.equal(
      verifyStripeSignature({
        rawBody: BODY,
        signatureHeader: `v1=${signature}`,
        secret: SECRET,
        nowSec: NOW,
      }),
      false,
    );
  });

  it("rejects a non-numeric timestamp", () => {
    assert.equal(
      verifyStripeSignature({
        rawBody: BODY,
        signatureHeader: header().replace(`t=${NOW}`, "t=not-a-number"),
        secret: SECRET,
        nowSec: NOW,
      }),
      false,
    );
  });

  it("rejects an empty signature header", () => {
    assert.equal(
      verifyStripeSignature({
        rawBody: BODY,
        signatureHeader: "",
        secret: SECRET,
        nowSec: NOW,
      }),
      false,
    );
  });

  it("rejects a malformed hex signature without throwing", () => {
    assert.equal(
      verifyStripeSignature({
        rawBody: BODY,
        signatureHeader: `t=${NOW},v1=zzzz`,
        secret: SECRET,
        nowSec: NOW,
      }),
      false,
    );
  });

  it("accepts when any v1 matches, as during secret rotation", () => {
    const valid = header().split("v1=")[1];
    assert.equal(
      verifyStripeSignature({
        rawBody: BODY,
        signatureHeader: `t=${NOW},v1=${"0".repeat(64)},v1=${valid}`,
        secret: SECRET,
        nowSec: NOW,
      }),
      true,
    );
  });

  it("binds the signature to the timestamp", () => {
    // Reusing a valid signature under a fresher timestamp must not verify,
    // otherwise the replay window could be extended indefinitely.
    const valid = header().split("v1=")[1];
    assert.equal(
      verifyStripeSignature({
        rawBody: BODY,
        signatureHeader: `t=${NOW + 60},v1=${valid}`,
        secret: SECRET,
        nowSec: NOW + 60,
      }),
      false,
    );
  });
});
