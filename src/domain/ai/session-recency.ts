import type { AssistantChatSession } from "@/domain/ai/assistant-chats";

export type SessionRecencyGroupId = "today" | "yesterday" | "week" | "older";

export type SessionRecencyGroup = {
  id: SessionRecencyGroupId;
  sessions: AssistantChatSession[];
};

function startOfLocalDay(timestamp: number): number {
  const date = new Date(timestamp);
  date.setHours(0, 0, 0, 0);
  return date.getTime();
}

/** Group conversations for the Core sidebar without a chat-app dump of dates. */
export function groupSessionsByRecency(
  sessions: AssistantChatSession[],
  now = Date.now(),
): SessionRecencyGroup[] {
  const today = startOfLocalDay(now);
  const yesterday = today - 86_400_000;
  const week = today - 7 * 86_400_000;

  const buckets: Record<SessionRecencyGroupId, AssistantChatSession[]> = {
    today: [],
    yesterday: [],
    week: [],
    older: [],
  };

  for (const session of sessions) {
    const updated = session.updatedAt;
    if (updated >= today) buckets.today.push(session);
    else if (updated >= yesterday) buckets.yesterday.push(session);
    else if (updated >= week) buckets.week.push(session);
    else buckets.older.push(session);
  }

  const order: SessionRecencyGroupId[] = ["today", "yesterday", "week", "older"];
  return order
    .filter((id) => buckets[id].length > 0)
    .map((id) => ({ id, sessions: buckets[id] }));
}
