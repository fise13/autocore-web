import assert from "node:assert/strict";
import test from "node:test";

import { verifiedAppleEmail } from "./apple-identity";

test("accepts an email only when Apple marks it verified", () => {
  assert.equal(
    verifiedAppleEmail({ email: " USER@EXAMPLE.COM ", email_verified: true }),
    "user@example.com",
  );
  assert.equal(
    verifiedAppleEmail({ email: "user@example.com", email_verified: "true" }),
    "user@example.com",
  );
});

test("rejects missing, malformed, and unverified email claims", () => {
  assert.equal(verifiedAppleEmail({ email: "user@example.com", email_verified: false }), null);
  assert.equal(verifiedAppleEmail({ email: "user@example.com" }), null);
  assert.equal(verifiedAppleEmail({ email: 42, email_verified: true }), null);
  assert.equal(verifiedAppleEmail({ email: " ", email_verified: true }), null);
});
