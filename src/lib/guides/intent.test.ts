import assert from "node:assert/strict";
import { test } from "node:test";

import { replyToGuideAsk } from "@/lib/guides/ask-interceptor";
import { resolveGuideIntent } from "@/lib/guides/intent";

test("how-to work order maps to create-work-order", () => {
  const intent = resolveGuideIntent("How do I create a work order?");
  assert.equal(intent?.type, "guide");
  if (intent?.type === "guide") assert.equal(intent.guide.id, "create-work-order");
});

test("invite mechanic maps to invite-team-member", () => {
  const intent = resolveGuideIntent("How do I invite a mechanic?");
  assert.equal(intent?.type, "guide");
  if (intent?.type === "guide") assert.equal(intent.guide.id, "invite-team-member");
});

test("add someone to my team maps to invite-team-member", () => {
  const intent = resolveGuideIntent("How do I add someone to my team?");
  assert.equal(intent?.type, "guide");
  if (intent?.type === "guide") assert.equal(intent.guide.id, "invite-team-member");
});

test("Russian how-to maps to the same guides", () => {
  const workOrder = resolveGuideIntent("Как создать заказ-наряд?");
  assert.equal(workOrder?.type, "guide");
  if (workOrder?.type === "guide") assert.equal(workOrder.guide.id, "create-work-order");

  const invite = resolveGuideIntent("Как пригласить механика?");
  assert.equal(invite?.type, "guide");
  if (invite?.type === "guide") assert.equal(invite.guide.id, "invite-team-member");
});

test("inventory question explains without a walkthrough", () => {
  const intent = resolveGuideIntent("How does inventory work?");
  assert.equal(intent?.type, "explain");
});

test("unrelated questions do not match", () => {
  assert.equal(resolveGuideIntent("What is the weather in Portland?"), null);
});

test("Help replies stay local and do not require Core chat", () => {
  const matched = replyToGuideAsk("How do I create a work order?");
  assert.equal(matched.length, 2);
  assert.equal(matched[0]?.role, "user");
  assert.equal(matched[1]?.role, "assistant");
  assert.ok(matched[1]?.parts.some((part) => part.type === "tool-showGuide"));

  const unmatched = replyToGuideAsk("What is the weather in Portland?");
  assert.equal(unmatched.length, 2);
  assert.equal(unmatched[1]?.role, "assistant");
  assert.ok(!unmatched[1]?.parts.some((part) => part.type.startsWith("tool-")));
});
