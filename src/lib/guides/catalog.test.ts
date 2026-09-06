import assert from "node:assert/strict";
import { test } from "node:test";

import { describeKnownGuides, getGuide, GUIDE_IDS, isKnownGuideId } from "@/lib/guides/catalog";

test("catalog exposes the production walkthroughs", () => {
  assert.deepEqual([...GUIDE_IDS].sort(), ["create-work-order", "invite-team-member"]);
  assert.equal(isKnownGuideId("create-work-order"), true);
  assert.equal(isKnownGuideId("unknown-guide"), false);
  assert.equal(getGuide("invite-team-member")?.title, "Invite a team member");
  assert.equal(getGuide("nope"), null);
});

test("guide copy is not playground-specific", () => {
  const workOrder = getGuide("create-work-order");
  const invite = getGuide("invite-team-member");
  assert.ok(workOrder);
  assert.ok(invite);
  assert.doesNotMatch(workOrder.summary + workOrder.aiExplanation, /Ridgeway|playground/i);
  assert.doesNotMatch(invite.summary + invite.aiExplanation, /Ridgeway|playground/i);
  for (const step of [...workOrder.steps, ...invite.steps]) {
    const blob = `${step.instruction} ${step.hint ?? ""} ${step.wrongClick ?? ""}`;
    assert.doesNotMatch(blob, /Ridgeway|playground|elena voss|ridgeway\.example/i);
  }
});

test("describeKnownGuides lists ids for the model", () => {
  assert.match(describeKnownGuides(), /create-work-order/);
  assert.match(describeKnownGuides(), /invite-team-member/);
});
