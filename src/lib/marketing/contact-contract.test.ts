import assert from "node:assert/strict";
import test from "node:test";

import {
  CONTACT_MESSAGE_MAX,
  CONTACT_MESSAGE_MIN,
  contactIntentLabel,
  isContactIntent,
  parseContactPayload,
} from "@/lib/marketing/contact-contract";

const valid = {
  intent: "sales",
  name: "Jordan Hale",
  email: "jordan@ridgeway.parts",
  company: "Ridgeway Performance",
  message: "We want a walkthrough of warehouse and engines next week.",
  website: "",
};

test("accepts a complete sales message", () => {
  const parsed = parseContactPayload(valid);
  assert.equal(parsed.success, true);
  if (parsed.success) {
    assert.equal(parsed.data.company, "Ridgeway Performance");
  }
});

test("trims fields and treats a missing company as empty", () => {
  const parsed = parseContactPayload({
    ...valid,
    name: "  Jordan  ",
    company: undefined,
  });
  assert.equal(parsed.success, true);
  if (parsed.success) {
    assert.equal(parsed.data.name, "Jordan");
    assert.equal(parsed.data.company, "");
  }
});

test("rejects a short message and a bad email", () => {
  const short = parseContactPayload({ ...valid, message: "Hi there" });
  assert.equal(short.success, false);

  const email = parseContactPayload({ ...valid, email: "not-an-email" });
  assert.equal(email.success, false);
});

test("rejects an overlong message", () => {
  const parsed = parseContactPayload({
    ...valid,
    message: "x".repeat(CONTACT_MESSAGE_MAX + 1),
  });
  assert.equal(parsed.success, false);
});

test("keeps the minimum message length in one place", () => {
  const parsed = parseContactPayload({
    ...valid,
    message: "x".repeat(CONTACT_MESSAGE_MIN),
  });
  assert.equal(parsed.success, true);
});

test("intent helpers stay aligned with the schema", () => {
  assert.equal(isContactIntent("sales"), true);
  assert.equal(isContactIntent("spam"), false);
  assert.equal(contactIntentLabel("partnerships"), "Partnership");
});
