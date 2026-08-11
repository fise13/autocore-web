import type { CoreUIMessage } from "@/domain/ai/core-message";

export const MAX_CHAT_SESSIONS = 40;
/** ~80 turns of user+assistant pairs. */
export const MAX_MESSAGES_PER_SESSION = 160;
export const CHAT_TITLE_MAX = 60;

export type AssistantChatSession = {
  id: string;
  title: string;
  updatedAt: number;
  messages: CoreUIMessage[];
};

export function createChatId(): string {
  return typeof crypto !== "undefined" && "randomUUID" in crypto
    ? crypto.randomUUID()
    : `chat-${Date.now()}`;
}

export function createEmptyChatSession(id = createChatId()): AssistantChatSession {
  return {
    id,
    title: "",
    updatedAt: Date.now(),
    messages: [],
  };
}

export function titleFromQuestion(question: string, emptyTitle = "New chat"): string {
  const trimmed = question.trim().replace(/\s+/g, " ");
  if (!trimmed) return emptyTitle;
  if (trimmed.length <= CHAT_TITLE_MAX) return trimmed;
  return `${trimmed.slice(0, CHAT_TITLE_MAX - 1).trimEnd()}…`;
}

/** Concatenated text of a message — the title source and the search surface. */
export function messageText(message: CoreUIMessage): string {
  return message.parts
    .filter((part): part is Extract<typeof part, { type: "text" }> => part.type === "text")
    .map((part) => part.text)
    .join(" ")
    .trim();
}

export function sortSessionsByUpdated(sessions: AssistantChatSession[]): AssistantChatSession[] {
  return [...sessions].sort((a, b) => b.updatedAt - a.updatedAt);
}

export function capSessions(sessions: AssistantChatSession[]): AssistantChatSession[] {
  return sortSessionsByUpdated(sessions).slice(0, MAX_CHAT_SESSIONS);
}

export function withUpdatedMessages(
  session: AssistantChatSession,
  messages: CoreUIMessage[],
  emptyTitle = "New chat",
): AssistantChatSession {
  const next = messages.slice(-MAX_MESSAGES_PER_SESSION);
  const firstUser = next.find((message) => message.role === "user");
  return {
    ...session,
    title: session.title.trim() || titleFromQuestion(firstUser ? messageText(firstUser) : "", emptyTitle),
    updatedAt: Date.now(),
    messages: next,
  };
}
