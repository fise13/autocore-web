import type {
  NotificationCategory as ServerCategory,
  NotificationPriority as ServerPriority,
  NotificationRecord,
} from '@/types/notifications';

/** Client-facing notification categories (ERP-scale taxonomy). */
export const APP_NOTIFICATION_CATEGORIES = [
  'order',
  'inventory',
  'finance',
  'subscription',
  'import',
  'export',
  'documents',
  'team',
  'sync',
  'system',
  'ai',
  'security',
] as const;

export type AppNotificationCategory = (typeof APP_NOTIFICATION_CATEGORIES)[number];

/** Four priority levels for client routing. */
export const APP_NOTIFICATION_PRIORITIES = ['critical', 'important', 'normal', 'silent'] as const;
export type AppNotificationPriority = (typeof APP_NOTIFICATION_PRIORITIES)[number];

export type NotificationAction = {
  label: string;
  type: 'navigate' | 'retry' | 'undo' | 'dismiss' | 'details';
  deepLink?: string;
  payload?: Record<string, unknown>;
};

export type AppNotification = {
  id: string;
  type: string;
  category: AppNotificationCategory;
  priority: AppNotificationPriority;
  title: string;
  message: string;
  createdAt: string;
  read: boolean;
  action?: NotificationAction;
  deepLink?: string;
  payload?: Record<string, unknown>;
  /** Source: server inbox or local-only */
  source: 'server' | 'local';
  /** Original server record id when synced */
  serverId?: string;
};

export type NotificationInput = {
  type: string;
  category: AppNotificationCategory;
  priority: AppNotificationPriority;
  title: string;
  message: string;
  deepLink?: string;
  action?: NotificationAction;
  payload?: Record<string, unknown>;
  /** Skip preference filtering (e.g. auth errors) */
  force?: boolean;
};

export type ErrorNotificationCode =
  | 'network'
  | 'auth_expired'
  | 'permission_denied'
  | 'upload_failed'
  | 'download_failed'
  | 'server_unavailable'
  | 'unexpected';

export type ImportProgressStage =
  | 'preparing'
  | 'uploading'
  | 'analyzing'
  | 'importing'
  | 'completed'
  | 'failed'
  | 'partial';

export type ImportProgressNotification = {
  importId: string;
  stage: ImportProgressStage;
  progress?: number;
  title?: string;
  message?: string;
  deepLink?: string;
  error?: string;
};

export type SyncNotificationEvent =
  | { type: 'synced' }
  | { type: 'failed'; error?: string; retry?: () => void }
  | { type: 'conflict'; conflictId?: string };

export type CategoryChannelPrefs = {
  push: boolean;
  inApp: boolean;
  activityFeed: boolean;
};

export type ExtendedCategoryPreferences = Record<AppNotificationCategory, CategoryChannelPrefs>;

export const DEFAULT_CATEGORY_CHANNEL_PREFS: CategoryChannelPrefs = {
  push: true,
  inApp: true,
  activityFeed: true,
};

export const DEFAULT_EXTENDED_CATEGORY_PREFS: ExtendedCategoryPreferences = Object.fromEntries(
  APP_NOTIFICATION_CATEGORIES.map((c) => [c, { ...DEFAULT_CATEGORY_CHANNEL_PREFS }]),
) as ExtendedCategoryPreferences;

export const APP_CATEGORY_LABELS: Record<AppNotificationCategory, string> = {
  order: 'Work Orders',
  inventory: 'Inventory',
  finance: 'Finance',
  subscription: 'Subscription',
  import: 'Import',
  export: 'Export',
  documents: 'Documents',
  team: 'Team',
  sync: 'Sync',
  system: 'System',
  ai: 'AI',
  security: 'Security',
};

export const APP_PRIORITY_LABELS: Record<AppNotificationPriority, string> = {
  critical: 'Critical',
  important: 'Important',
  normal: 'Normal',
  silent: 'Silent',
};

/** Map server inbox record → unified app notification. */
export function fromServerRecord(record: NotificationRecord): AppNotification {
  return {
    id: record.id,
    serverId: record.id,
    type: record.eventType,
    category: mapServerCategory(record.category),
    priority: mapServerPriority(record.priority),
    title: record.title,
    message: record.body,
    createdAt: record.createdAt,
    read: record.state !== 'unread',
    deepLink: record.deepLink,
    payload: {
      aggregateType: record.aggregateType,
      aggregateId: record.aggregateId,
      actorName: record.actorName,
      groupKey: record.groupKey,
      groupCount: record.groupCount,
    },
    source: 'server',
  };
}

export function mapServerCategory(category: ServerCategory): AppNotificationCategory {
  const map: Record<ServerCategory, AppNotificationCategory> = {
    work_orders: 'order',
    reservations: 'inventory',
    warranty: 'documents',
    inventory: 'inventory',
    payments: 'finance',
    invoices: 'finance',
    team: 'team',
    scan: 'system',
    sales: 'finance',
    system: 'system',
  };
  return map[category] ?? 'system';
}

export function mapServerPriority(priority: ServerPriority): AppNotificationPriority {
  const map: Record<ServerPriority, AppNotificationPriority> = {
    critical: 'critical',
    high: 'important',
    medium: 'normal',
    low: 'silent',
  };
  return map[priority] ?? 'normal';
}

export function mapAppPriorityToServer(priority: AppNotificationPriority): ServerPriority {
  const map: Record<AppNotificationPriority, ServerPriority> = {
    critical: 'critical',
    important: 'high',
    normal: 'medium',
    silent: 'low',
  };
  return map[priority];
}
