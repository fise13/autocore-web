import assert from "node:assert/strict";
import { test } from "node:test";

import {
  capSessions,
  createEmptyChatSession,
  MAX_CHAT_SESSIONS,
  MAX_MESSAGES_PER_SESSION,
  messageText,
  titleFromQuestion,
  withUpdatedMessages,
} from "@/domain/ai/assistant-chats";
import type { CoreUIMessage } from "@/domain/ai/core-message";

function userMessage(id: string, text: string): CoreUIMessage {
  return { id, role: "user", parts: [{ type: "text", text }] } as CoreUIMessage;
}

function assistantMessage(id: string, text: string): CoreUIMessage {
  return { id, role: "assistant", parts: [{ type: "text", text }] } as CoreUIMessage;
}

test("titleFromQuestion truncates long questions", () => {
  const long = "a".repeat(80);
  const title = titleFromQuestion(long);
  assert.ok(title.endsWith("…"));
  assert.ok(title.length <= 60);
});

test("withUpdatedMessages titles the session from the first user message", () => {
  const session = createEmptyChatSession("s1");
  const next = withUpdatedMessages(session, [
    userMessage("m1", "Show unpaid invoices"),
    assistantMessage("m2", "Three invoices are unpaid."),
  ]);
  assert.equal(next.title, "Show unpaid invoices");
  assert.equal(next.messages.length, 2);
});

test("withUpdatedMessages titles from the user turn, not the assistant reply", () => {
  const session = createEmptyChatSession("s2");
  const next = withUpdatedMessages(session, [
    assistantMessage("m0", "Welcome to Core"),
    userMessage("m1", "Where is engine N54"),
  ]);
  assert.equal(next.title, "Where is engine N54");
});

test("withUpdatedMessages keeps an existing title", () => {
  const session = { ...createEmptyChatSession("s3"), title: "Pinned name" };
  const next = withUpdatedMessages(session, [userMessage("m1", "Something else")]);
  assert.equal(next.title, "Pinned name");
});

test("withUpdatedMessages caps history to the newest messages", () => {
  const session = createEmptyChatSession("s4");
  const many = Array.from({ length: MAX_MESSAGES_PER_SESSION + 10 }, (_, index) =>
    userMessage(`m-${index}`, `q-${index}`),
  );
  const next = withUpdatedMessages(session, many);
  assert.equal(next.messages.length, MAX_MESSAGES_PER_SESSION);
  assert.equal(next.messages.at(-1)?.id, `m-${MAX_MESSAGES_PER_SESSION + 9}`);
});

test("messageText concatenates only text parts", () => {
  const message = {
    id: "m1",
    role: "assistant",
    parts: [
      { type: "reasoning", text: "internal" },
      { type: "text", text: "Visible" },
      { type: "tool-searchEngines", state: "output-available", output: {} },
    ],
  } as unknown as CoreUIMessage;
  assert.equal(messageText(message), "Visible");
});

test("capSessions keeps newest sessions", () => {
  const sessions = Array.from({ length: MAX_CHAT_SESSIONS + 5 }, (_, index) => ({
    ...createEmptyChatSession(`s-${index}`),
    updatedAt: index,
  }));
  const capped = capSessions(sessions);
  assert.equal(capped.length, MAX_CHAT_SESSIONS);
  assert.equal(capped[0]?.id, `s-${MAX_CHAT_SESSIONS + 4}`);
});
