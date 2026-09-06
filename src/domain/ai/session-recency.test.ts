import assert from "node:assert/strict";
import { test } from "node:test";

import { createEmptyChatSession } from "@/domain/ai/assistant-chats";
import { groupSessionsByRecency } from "@/domain/ai/session-recency";

const noon = new Date("2026-09-06T12:00:00").getTime();

test("groupSessionsByRecency buckets by local calendar day", () => {
  const today = { ...createEmptyChatSession("a"), updatedAt: noon };
  const yesterday = {
    ...createEmptyChatSession("b"),
    updatedAt: noon - 86_400_000,
  };
  const lastWeek = {
    ...createEmptyChatSession("c"),
    updatedAt: noon - 3 * 86_400_000,
  };
  const older = {
    ...createEmptyChatSession("d"),
    updatedAt: noon - 20 * 86_400_000,
  };

  const groups = groupSessionsByRecency([older, today, lastWeek, yesterday], noon);
  assert.deepEqual(
    groups.map((group) => [group.id, group.sessions.map((session) => session.id)]),
    [
      ["today", ["a"]],
      ["yesterday", ["b"]],
      ["week", ["c"]],
      ["older", ["d"]],
    ],
  );
});

test("groupSessionsByRecency omits empty buckets", () => {
  const today = { ...createEmptyChatSession("a"), updatedAt: noon };
  const groups = groupSessionsByRecency([today], noon);
  assert.deepEqual(
    groups.map((group) => group.id),
    ["today"],
  );
});
