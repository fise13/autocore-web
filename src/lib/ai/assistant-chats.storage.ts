import {
  capSessions,
  createChatId,
  type AssistantChatSession,
} from "@/domain/ai/assistant-chats";
import type { CoreUIMessage } from "@/domain/ai/core-message";

const STORAGE_PREFIX_V1 = "autocore.core.chats.v1";
const STORAGE_PREFIX_V2 = "autocore.core.chats.v2";

export function chatStorageKey(uid: string, companyId: string): string {
  return `${STORAGE_PREFIX_V2}:${uid}:${companyId || "none"}`;
}

export function legacyChatStorageKey(uid: string, companyId: string): string {
  return `${STORAGE_PREFIX_V1}:${uid}:${companyId || "none"}`;
}

/**
 * Shape check for a persisted message.
 *
 * Deliberately structural rather than exhaustive: the route re-validates every
 * message against the live tool schemas with `validateUIMessages` before it
 * reaches the model, so this only has to stop the renderer from crashing on a
 * malformed payload.
 */
function isMessage(value: unknown): value is CoreUIMessage {
  if (!value || typeof value !== "object") return false;
  const message = value as Record<string, unknown>;
  if (typeof message.id !== "string") return false;
  if (message.role !== "user" && message.role !== "assistant" && message.role !== "system") {
    return false;
  }
  if (!Array.isArray(message.parts)) return false;
  return message.parts.every(
    (part) => part && typeof part === "object" && typeof (part as { type?: unknown }).type === "string",
  );
}

function isSession(value: unknown): value is AssistantChatSession {
  if (!value || typeof value !== "object") return false;
  const session = value as Record<string, unknown>;
  return (
    typeof session.id === "string" &&
    typeof session.title === "string" &&
    typeof session.updatedAt === "number" &&
    Array.isArray(session.messages) &&
    session.messages.every(isMessage)
  );
}

/* ------------------------------------------------------------------ migration */

/** The v1 turn shape, kept only to read legacy history. */
type LegacyTurn = {
  id?: unknown;
  question?: unknown;
  answer?: { summary?: unknown } | null;
};

type LegacySession = {
  id?: unknown;
  title?: unknown;
  updatedAt?: unknown;
  turns?: unknown;
};

function textMessage(role: "user" | "assistant", text: string): CoreUIMessage {
  return {
    id: createChatId(),
    role,
    parts: [{ type: "text", text }],
  } as CoreUIMessage;
}

/**
 * Convert one v1 session to v2.
 *
 * Only the question and the answer summary survive. The old `blocks` are
 * dropped deliberately: they were never live data — v1 explicitly told users
 * "figures are not read live" — so replaying them as if they were real
 * readings would be worse than losing them.
 */
function migrateSession(value: unknown): AssistantChatSession | null {
  if (!value || typeof value !== "object") return null;
  const legacy = value as LegacySession;
  if (typeof legacy.id !== "string") return null;
  if (!Array.isArray(legacy.turns)) return null;

  const messages: CoreUIMessage[] = [];
  for (const turn of legacy.turns as LegacyTurn[]) {
    if (!turn || typeof turn !== "object") continue;
    const question = typeof turn.question === "string" ? turn.question.trim() : "";
    if (question) messages.push(textMessage("user", question));
    const summary =
      turn.answer && typeof turn.answer === "object" && typeof turn.answer.summary === "string"
        ? turn.answer.summary.trim()
        : "";
    if (summary) messages.push(textMessage("assistant", summary));
  }

  if (messages.length === 0) return null;

  return {
    id: legacy.id,
    title: typeof legacy.title === "string" ? legacy.title : "",
    updatedAt: typeof legacy.updatedAt === "number" ? legacy.updatedAt : Date.now(),
    messages,
  };
}

/**
 * Read v1 history and write it forward.
 *
 * The v1 key is left in place for one release: the migration is one-way, and a
 * rollback that found an empty v1 bucket would destroy the user's history.
 */
export function migrateV1Sessions(uid: string, companyId: string): AssistantChatSession[] {
  if (typeof window === "undefined" || !uid) return [];
  try {
    const raw = window.localStorage.getItem(legacyChatStorageKey(uid, companyId));
    if (!raw) return [];
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) return [];

    const migrated = capSessions(
      parsed
        .map(migrateSession)
        .filter((session): session is AssistantChatSession => session !== null),
    );
    if (migrated.length) saveChatSessions(uid, companyId, migrated);
    return migrated;
  } catch {
    return [];
  }
}

/* -------------------------------------------------------------------- read/write */

export function loadChatSessions(uid: string, companyId: string): AssistantChatSession[] {
  if (typeof window === "undefined" || !uid) return [];
  try {
    const raw = window.localStorage.getItem(chatStorageKey(uid, companyId));
    if (raw === null) {
      // No v2 bucket yet — this is the first load after the upgrade.
      return migrateV1Sessions(uid, companyId);
    }
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) return [];
    return capSessions(parsed.filter(isSession));
  } catch {
    return [];
  }
}

export function saveChatSessions(
  uid: string,
  companyId: string,
  sessions: AssistantChatSession[],
): void {
  if (typeof window === "undefined" || !uid) return;
  try {
    window.localStorage.setItem(
      chatStorageKey(uid, companyId),
      JSON.stringify(capSessions(sessions)),
    );
  } catch {
    // Quota / private mode — ignore; in-memory sessions still work.
  }
}
