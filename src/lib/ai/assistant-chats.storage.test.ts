import assert from "node:assert/strict";
import { afterEach, beforeEach, test } from "node:test";

/**
 * The v1 → v2 migration is one-way and runs against real user history, so it
 * is pinned here: a silent failure would look like "all my chats disappeared".
 */

class MemoryStorage {
  private store = new Map<string, string>();
  /** Set to make `setItem` throw, simulating quota / private mode. */
  failWrites = false;

  getItem(key: string): string | null {
    return this.store.get(key) ?? null;
  }
  setItem(key: string, value: string): void {
    if (this.failWrites) throw new Error("QuotaExceededError");
    this.store.set(key, value);
  }
  removeItem(key: string): void {
    this.store.delete(key);
  }
  clear(): void {
    this.store.clear();
  }
  get size(): number {
    return this.store.size;
  }
}

const storage = new MemoryStorage();
const UID = "uid-1";
const COMPANY = "company-1";

beforeEach(() => {
  storage.clear();
  storage.failWrites = false;
  (globalThis as { window?: unknown }).window = { localStorage: storage };
});

afterEach(() => {
  delete (globalThis as { window?: unknown }).window;
});

async function storageModule() {
  return import("@/lib/ai/assistant-chats.storage");
}

function seedV1(sessions: unknown): void {
  storage.setItem(`autocore.core.chats.v1:${UID}:${COMPANY}`, JSON.stringify(sessions));
}

const V1_SESSION = {
  id: "chat-1",
  title: "Unpaid invoices",
  updatedAt: 1_700_000_000_000,
  turns: [
    {
      id: "turn-1",
      question: "Show unpaid invoices",
      answer: {
        summary: "Three invoices are unpaid.",
        blocks: [{ type: "action", label: "Open accounting", href: "/accounting" }],
        followUps: [],
        source: "model",
      },
      error: null,
    },
  ],
};

test("v1 history migrates to v2 messages", async () => {
  const { loadChatSessions, chatStorageKey } = await storageModule();
  seedV1([V1_SESSION]);

  const sessions = loadChatSessions(UID, COMPANY);

  assert.equal(sessions.length, 1);
  assert.equal(sessions[0]?.id, "chat-1");
  assert.equal(sessions[0]?.title, "Unpaid invoices");
  assert.deepEqual(
    sessions[0]?.messages.map((message) => message.role),
    ["user", "assistant"],
  );
  // The migrated payload is written forward so the next load skips migration.
  assert.notEqual(storage.getItem(chatStorageKey(UID, COMPANY)), null);
});

test("migration drops v1 blocks rather than replaying them as live data", async () => {
  const { loadChatSessions } = await storageModule();
  seedV1([V1_SESSION]);

  const parts = loadChatSessions(UID, COMPANY)[0]!.messages.flatMap((message) => message.parts);

  assert.ok(parts.every((part) => part.type === "text"));
  assert.equal(
    JSON.stringify(parts).includes("Open accounting"),
    false,
    "v1 blocks were never read from live data and must not be resurrected",
  );
});

test("the v1 key survives migration so a rollback keeps history", async () => {
  const { loadChatSessions, legacyChatStorageKey } = await storageModule();
  seedV1([V1_SESSION]);

  loadChatSessions(UID, COMPANY);

  assert.notEqual(storage.getItem(legacyChatStorageKey(UID, COMPANY)), null);
});

test("an existing v2 bucket is not re-migrated over", async () => {
  const { loadChatSessions, saveChatSessions } = await storageModule();
  seedV1([V1_SESSION]);
  saveChatSessions(UID, COMPANY, [
    { id: "chat-2", title: "Newer", updatedAt: 2, messages: [] },
  ]);

  const sessions = loadChatSessions(UID, COMPANY);

  assert.equal(sessions.length, 1);
  assert.equal(sessions[0]?.id, "chat-2");
});

test("turns with no answer still migrate the question", async () => {
  const { loadChatSessions } = await storageModule();
  seedV1([
    {
      ...V1_SESSION,
      turns: [{ id: "t", question: "Half-finished question", answer: null, error: "boom" }],
    },
  ]);

  const messages = loadChatSessions(UID, COMPANY)[0]!.messages;

  assert.equal(messages.length, 1);
  assert.equal(messages[0]?.role, "user");
});

test("empty v1 sessions are dropped, not migrated as blanks", async () => {
  const { loadChatSessions } = await storageModule();
  seedV1([{ id: "empty", title: "", updatedAt: 1, turns: [] }]);

  assert.deepEqual(loadChatSessions(UID, COMPANY), []);
});

test("malformed payloads never throw", async () => {
  const { loadChatSessions, chatStorageKey, legacyChatStorageKey } = await storageModule();

  for (const bad of ["not json", "null", '{"not":"an array"}', "[1,2,3]", '[{"id":1}]']) {
    storage.setItem(chatStorageKey(UID, COMPANY), bad);
    assert.deepEqual(loadChatSessions(UID, COMPANY), [], `v2 payload ${bad}`);
  }

  storage.removeItem(chatStorageKey(UID, COMPANY));
  for (const bad of ["not json", "null", '{"turns":[]}']) {
    storage.setItem(legacyChatStorageKey(UID, COMPANY), bad);
    assert.deepEqual(loadChatSessions(UID, COMPANY), [], `v1 payload ${bad}`);
  }
});

test("messages with unknown part types are rejected, not rendered", async () => {
  const { loadChatSessions, chatStorageKey } = await storageModule();
  storage.setItem(
    chatStorageKey(UID, COMPANY),
    JSON.stringify([
      {
        id: "chat-x",
        title: "Tampered",
        updatedAt: 1,
        messages: [{ id: "m1", role: "user", parts: [{ noType: true }] }],
      },
    ]),
  );

  assert.deepEqual(loadChatSessions(UID, COMPANY), []);
});

test("a write failure leaves in-memory sessions usable", async () => {
  const { saveChatSessions } = await storageModule();
  storage.failWrites = true;

  assert.doesNotThrow(() =>
    saveChatSessions(UID, COMPANY, [{ id: "c", title: "t", updatedAt: 1, messages: [] }]),
  );
});

test("sessions are scoped per user and company", async () => {
  const { chatStorageKey } = await storageModule();
  assert.notEqual(chatStorageKey("uid-a", "co-1"), chatStorageKey("uid-b", "co-1"));
  assert.notEqual(chatStorageKey("uid-a", "co-1"), chatStorageKey("uid-a", "co-2"));
});
