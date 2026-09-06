import type { UserRole } from "@/domain/user";

/** Delivery channels — push is one channel among many. */
export const NOTIFICATION_CHANNELS = [
  "inbox",
  "push",
  "badge",
  "email",
  "sms",
  "webhook",
] as const;

export type NotificationChannel = (typeof NOTIFICATION_CHANNELS)[number];

export const NOTIFICATION_PRIORITIES = ["critical", "high", "medium", "low"] as const;

export type NotificationPriority = (typeof NOTIFICATION_PRIORITIES)[number];

/** User-facing categories mapped to settings toggles. */
export const NOTIFICATION_CATEGORIES = [
  "work_orders",
  "reservations",
  "warranty",
  "inventory",
  "payments",
  "invoices",
  "team",
  "scan",
  "sales",
  "system",
] as const;

export type NotificationCategory = (typeof NOTIFICATION_CATEGORIES)[number];

export const NOTIFICATION_INBOX_STATES = ["unread", "read", "archived", "dismissed"] as const;

export type NotificationInboxState = (typeof NOTIFICATION_INBOX_STATES)[number];

/**
 * Canonical notification event types.
 * Adding a new notification = register here + assign priority/channels in event-registry.
 */
export const NOTIFICATION_EVENT_TYPES = [
  "work_order.created",
  "work_order.updated",
  "work_order.assigned",
  "work_order.available",
  "work_order.completed",
  "work_order.left_open",
  "work_order.waiting_parts",
  "invoice.created",
  "invoice.paid",
  "invoice.overdue",
  "engine.sold",
  "engine.reserved",
  "inventory.low_stock",
  "customer.created",
  "employee.invited",
  "employee.joined_by_invite",
  "employee.joined_welcome",
  "employee.removed_from_company",
  "employee.access_suspended",
  "role.changed",
  "warranty.expiring",
  "subscription.expiring",
  "system.error",
  "sync.failed",
  "import.finished",
  "document_import.created",
  "scan.completed",
  "sales.daily_summary",
  "sales.large_sale",
  "core.shift_briefing",
] as const;

export type NotificationEventType = (typeof NOTIFICATION_EVENT_TYPES)[number];

export type QuietHoursConfig = {
  enabled: boolean;
  /** 0–23 local hour */
  startHour: number;
  /** 0–23 local hour */
  endHour: number;
  /** IANA timezone, e.g. Europe/Moscow */
  timezone: string;
};

export type CategoryPreferences = Record<NotificationCategory, boolean>;

export type NotificationPreferences = {
  channels: {
    push: boolean;
    email: boolean;
    inbox: boolean;
  };
  categories: CategoryPreferences;
  quietHours: QuietHoursConfig;
  /** Digest email at 09:00 company time */
  emailDigestEnabled: boolean;
  updatedAt?: string;
};

export type NotificationDevice = {
  id: string;
  platform: "ios" | "android" | "web";
  pushToken: string;
  appVersion?: string;
  lastSeenAt: string;
};

export type NotificationRecord = {
  id: string;
  userId: string;
  companyId: string;
  eventType: NotificationEventType;
  category: NotificationCategory;
  priority: NotificationPriority;
  title: string;
  body: string;
  state: NotificationInboxState;
  deepLink?: string;
  groupKey?: string;
  groupCount?: number;
  actorUserId?: string;
  actorName?: string;
  aggregateType?: string;
  aggregateId?: string;
  eventId?: string;
  channelsDelivered: NotificationChannel[];
  createdAt: string;
  readAt?: string;
  archivedAt?: string;
};

export type NotificationEventContext = {
  companyId: string;
  eventType: NotificationEventType;
  actorUserId?: string;
  actorName?: string;
  aggregateType?: string;
  aggregateId?: string;
  eventId?: string;
  payload?: Record<string, unknown>;
  /** Override registry title/body */
  title?: string;
  body?: string;
  deepLink?: string;
  /** Explicit recipients — skips role resolution when set */
  recipientUserIds?: string[];
  /** Assignee-only routing for mechanics */
  assigneeUserIds?: string[];
};

export type NotificationEventDefinition = {
  eventType: NotificationEventType;
  category: NotificationCategory;
  priority: NotificationPriority;
  defaultChannels: NotificationChannel[];
  /** Roles that may receive this event (filtered further by category prefs). */
  roles: UserRole[];
  /** When set, recipient must have at least one permission. */
  permissions?: string[];
  /** Mechanics/diagnosticians: only assignees when assigneeUserIds provided */
  assigneeOnlyForRoles?: UserRole[];
  groupable: boolean;
  groupWindowMinutes: number;
  buildGroupKey: (ctx: NotificationEventContext) => string;
  buildCopy: (ctx: NotificationEventContext) => { title: string; body: string };
  buildDeepLink: (ctx: NotificationEventContext) => string | undefined;
};
