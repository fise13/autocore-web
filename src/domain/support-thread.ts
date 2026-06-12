export const SUPPORT_THREAD_STATUSES = [
  "open",
  "bot",
  "awaiting_human",
  "human",
  "closed",
] as const;

export type SupportThreadStatus = (typeof SUPPORT_THREAD_STATUSES)[number];

export const SUPPORT_MESSAGE_ROLES = ["user", "bot", "agent", "system"] as const;

export type SupportMessageRole = (typeof SUPPORT_MESSAGE_ROLES)[number];

export type SupportThread = {
  id: string;
  companyId: string;
  userId: string;
  userName: string;
  userEmail: string;
  status: SupportThreadStatus;
  createdAt: Date;
  updatedAt: Date;
  lastMessageAt: Date;
};

export type SupportMessage = {
  id: string;
  role: SupportMessageRole;
  text: string;
  createdAt: Date;
  authorId?: string;
};
