export const NOTIFICATION_CATEGORIES = [
  'work_orders',
  'reservations',
  'warranty',
  'inventory',
  'payments',
  'invoices',
  'team',
  'scan',
  'sales',
  'system',
] as const;

export type NotificationCategory = (typeof NOTIFICATION_CATEGORIES)[number];

export const NOTIFICATION_PRIORITIES = ['critical', 'high', 'medium', 'low'] as const;
export type NotificationPriority = (typeof NOTIFICATION_PRIORITIES)[number];

export const NOTIFICATION_INBOX_STATES = ['unread', 'read', 'archived', 'dismissed'] as const;
export type NotificationInboxState = (typeof NOTIFICATION_INBOX_STATES)[number];

export type QuietHoursConfig = {
  enabled: boolean;
  startHour: number;
  endHour: number;
  timezone: string;
};

export type CategoryPreferences = Record<NotificationCategory, boolean>;

export type NotificationPreferences = {
  channels: {
    push: boolean;
    email: boolean;
    inbox: boolean;
    /** In-app banners (foreground alerts). */
    inApp?: boolean;
  };
  categories: CategoryPreferences;
  quietHours: QuietHoursConfig;
  emailDigestEnabled: boolean;
  updatedAt?: string;
};

export type NotificationRecord = {
  id: string;
  userId: string;
  companyId: string;
  eventType: string;
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
  channelsDelivered: Array<'inbox' | 'push' | 'badge' | 'email'>;
  createdAt: string;
  readAt?: string;
  archivedAt?: string;
};

export const NOTIFICATION_CATEGORY_LABELS: Record<NotificationCategory, string> = {
  work_orders: 'Work Orders',
  reservations: 'Reservations',
  warranty: 'Warranty',
  inventory: 'Inventory',
  payments: 'Payments',
  invoices: 'Invoices',
  team: 'Team',
  scan: 'Scan',
  sales: 'Sales',
  system: 'System',
};

export const DEFAULT_NOTIFICATION_PREFERENCES: NotificationPreferences = {
  channels: { push: true, email: false, inbox: true, inApp: true },
  categories: {
    work_orders: true,
    reservations: true,
    warranty: true,
    inventory: true,
    payments: true,
    invoices: true,
    team: true,
    scan: true,
    sales: true,
    system: true,
  },
  quietHours: {
    enabled: false,
    startHour: 22,
    endHour: 8,
    timezone: 'Europe/Moscow',
  },
  emailDigestEnabled: false,
};

export const QUIET_HOUR_OPTIONS = [20, 21, 22, 23, 0, 6, 7, 8, 9] as const;
