import assert from "node:assert/strict";
import { test } from "node:test";

import { PRO_STATUSES, resolveProActive } from "./index";

test("proActive is authoritative when the server wrote it", () => {
  // A stale plan/status must not override the flag in either direction.
  assert.equal(resolveProActive({ proActive: true, plan: "free", status: "canceled" }), true);
  assert.equal(resolveProActive({ proActive: false, plan: "pro", status: "active" }), false);
});

test("falls back to plan and status on documents written before the flag", () => {
  assert.equal(resolveProActive({ plan: "pro", status: "active" }), true);
  assert.equal(resolveProActive({ plan: "pro", status: "canceled" }), false);
  assert.equal(resolveProActive({ plan: "free", status: "active" }), false);
});

test("enterprise counts as Pro", () => {
  // The web used to match on plan === "pro" alone, which denied paid features
  // to enterprise companies while mobile granted them.
  assert.equal(resolveProActive({ plan: "enterprise", status: "active" }), true);
});

test("a failed payment does not lock the shop out", () => {
  assert.ok(PRO_STATUSES.includes("past_due"));
  assert.equal(resolveProActive({ plan: "pro", status: "past_due" }), true);
  assert.equal(resolveProActive({ plan: "pro", status: "trialing" }), true);
});

test("unknown and missing values degrade to free, never to Pro", () => {
  assert.equal(resolveProActive(null), false);
  assert.equal(resolveProActive(undefined), false);
  assert.equal(resolveProActive({}), false);
  assert.equal(resolveProActive({ plan: "platinum", status: "active" }), false);
  // An unrecognised status normalises to "active", so the plan must still gate.
  assert.equal(resolveProActive({ plan: "pro", status: "who-knows" }), true);
  assert.equal(resolveProActive({ proActive: "yes" }), false);
});
