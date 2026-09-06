import assert from "node:assert/strict";
import { test } from "node:test";

import { reduceGuideState } from "@/lib/guides/controller";
import { INITIAL_GUIDE_STATE } from "@/lib/guides/types";
import { CREATE_WORK_ORDER_GUIDE } from "@/lib/guides/definitions/create-work-order";
import { INVITE_TEAM_MEMBER_GUIDE } from "@/lib/guides/definitions/invite-team-member";

const guides = [CREATE_WORK_ORDER_GUIDE, INVITE_TEAM_MEMBER_GUIDE];

test("start enters the first step of a known guide", () => {
  const next = reduceGuideState(INITIAL_GUIDE_STATE, { type: "start", guideId: "create-work-order" }, guides);
  assert.equal(next.status, "active");
  assert.equal(next.guideId, "create-work-order");
  assert.equal(next.stepIndex, 0);
});

test("unknown guide does not start", () => {
  const next = reduceGuideState(INITIAL_GUIDE_STATE, { type: "start", guideId: "nope" }, guides);
  assert.equal(next.status, "idle");
});

test("complete-step advances and finishes on the last step", () => {
  let state = reduceGuideState(INITIAL_GUIDE_STATE, { type: "start", guideId: "invite-team-member" }, guides);
  const last = INVITE_TEAM_MEMBER_GUIDE.steps.length - 1;
  for (let i = 0; i < last; i += 1) {
    state = reduceGuideState(state, { type: "complete-step" }, guides);
    assert.equal(state.status, "active");
    assert.equal(state.stepIndex, i + 1);
  }
  state = reduceGuideState(state, { type: "complete-step" }, guides);
  assert.equal(state.status, "completed");
});

test("back does not go below zero", () => {
  const started = reduceGuideState(INITIAL_GUIDE_STATE, { type: "start", guideId: "create-work-order" }, guides);
  const back = reduceGuideState(started, { type: "back" }, guides);
  assert.equal(back.stepIndex, 0);
});

test("back stays on the previous step until that step is completed again", () => {
  let state = reduceGuideState(INITIAL_GUIDE_STATE, { type: "start", guideId: "create-work-order" }, guides);
  state = reduceGuideState(state, { type: "complete-step" }, guides);
  state = reduceGuideState(state, { type: "complete-step" }, guides);
  assert.equal(state.stepIndex, 2);
  state = reduceGuideState(state, { type: "back" }, guides);
  assert.equal(state.status, "active");
  assert.equal(state.stepIndex, 1);
});

test("wrong-click is cleared on the next step", () => {
  let state = reduceGuideState(INITIAL_GUIDE_STATE, { type: "start", guideId: "create-work-order" }, guides);
  state = reduceGuideState(state, { type: "wrong-click" }, guides);
  assert.equal(state.wrongClick, true);
  state = reduceGuideState(state, { type: "complete-step" }, guides);
  assert.equal(state.wrongClick, false);
  assert.equal(state.stepIndex, 1);
});

