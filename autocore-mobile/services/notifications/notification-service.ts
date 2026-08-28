import { getJson, setJson } from '@/lib/storage/kv';
import type { NotificationPreferences } from '@/types/notifications';
import { DEFAULT_NOTIFICATION_PREFERENCES } from '@/types/notifications';
import { MobileApiError } from '@/services/api/mobile-client';

import { ORDER_EVENTS } from './event-types';
import { buildImportDeepLink, buildOrderDeepLink, openNotificationDeepLink } from './deep-link-resolver';
import {
  archiveServerNotification,
  dismissServerNotification,
  markAllServerNotificationsRead,
  markServerNotificationRead,
  syncInboxFromServer,
} from './inbox-sync';
import {
  INBOX_PAGE_SIZE,
  loadInboxCache,
  markAllReadInCache,
  markNotificationReadInCache,
  paginateItems,
  removeNotificationFromCache,
  saveInboxCache,
  upsertLocalNotification,
} from './local-store';
import {
  attachForegroundListener,
  attachPushListeners,
  ensureNotificationHandler,
  ensurePushDeviceRegistered,
  resetPushRegistrationState,
  scheduleLocalNotification,
  setBadgeCount,
} from './push-channel';
import * as Notifications from 'expo-notifications';
import {
  resolveDeliveryChannels,
  resolveLiveEditingChannels,
  resolveSyncChannels,
} from './priority-router';
import type {
  AppNotification,
  AppNotificationCategory,
  AppNotificationPriority,
  ErrorNotificationCode,
  ExtendedCategoryPreferences,
  ImportProgressNotification,
  NotificationInput,
  SyncNotificationEvent,
} from './types';
import { DEFAULT_EXTENDED_CATEGORY_PREFS } from './types';
import { getNotificationStore } from '@/stores/notification-store';

const EXTENDED_PREFS_KEY = 'autocore-mobile:notification-extended-prefs:v1';

type InitOptions = {
  enabled: boolean;
  pushEnabled?: boolean;
  serverPrefs?: NotificationPreferences;
};

let teardownFns: Array<() => void> = [];

function createId(): string {
  return `local-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}

function loadExtendedPrefs(): ExtendedCategoryPreferences {
  return getJson<ExtendedCategoryPreferences>(EXTENDED_PREFS_KEY) ?? DEFAULT_EXTENDED_CATEGORY_PREFS;
}

function saveExtendedPrefs(prefs: ExtendedCategoryPreferences): void {
  setJson(EXTENDED_PREFS_KEY, prefs);
}

function hydrateFromCache(): void {
  const cache = loadInboxCache();
  const store = getNotificationStore();
  const { slice, hasMore } = paginateItems(cache.items, 0);
  store.setItems(slice, cache.unreadCount);
  store.setHasMore(hasMore);
  store.setPage(0);
  void setBadgeCount(cache.unreadCount);
}

function applyToCacheAndStore(notification: AppNotification): void {
  const cache = loadInboxCache();
  const next = upsertLocalNotification(cache, notification);
  saveInboxCache(next);

  const store = getNotificationStore();
  const { slice, hasMore } = paginateItems(next.items, store.page);
  store.setItems(slice, next.unreadCount);
  store.setHasMore(hasMore);
  void setBadgeCount(next.unreadCount);
}

function getPrefs(): NotificationPreferences {
  return getNotificationStore().serverPrefs ?? DEFAULT_NOTIFICATION_PREFERENCES;
}

function getExtendedPrefs(): ExtendedCategoryPreferences {
  return getNotificationStore().extendedPrefs ?? loadExtendedPrefs();
}

function deliverNotification(
  notification: AppNotification,
  channels: ReturnType<typeof resolveDeliveryChannels>,
): void {
  const store = getNotificationStore();

  if (channels.activityFeed) {
    applyToCacheAndStore(notification);
  }

  if (channels.inApp) {
    const bannerPriority =
      notification.priority === 'critical'
        ? 'critical'
        : notification.priority === 'important'
          ? 'important'
          : 'warning';

    store.showBanner({
      title: notification.title,
      message: notification.message,
      priority: bannerPriority,
      deepLink: notification.deepLink,
      actions: notification.deepLink
        ? [
            {
              label: 'Open',
              onPress: () => void openNotificationDeepLink(notification.deepLink),
            },
          ]
        : undefined,
    });
  }

  if (channels.toast) {
    void import('@/components/ui/toast-store').then(({ toast }) => {
      toast({
        title: notification.title,
        description: notification.message,
        variant: notification.priority === 'critical' ? 'destructive' : 'success',
      });
    });
  }

  if (channels.local) {
    void scheduleLocalNotification({
      id: notification.id,
      title: notification.title,
      body: notification.message,
      data: { deepLink: notification.deepLink, type: notification.type },
      channelId: notification.priority === 'silent' ? 'silent' : 'default',
    });
  }
}

export const NotificationService = {
  async init(options: InitOptions): Promise<void> {
    ensureNotificationHandler();
    const store = getNotificationStore();

    if (options.serverPrefs) {
      store.setServerPrefs(options.serverPrefs);
    }
    store.setExtendedPrefs(loadExtendedPrefs());
    hydrateFromCache();

    if (!options.enabled) return;

    teardownFns.push(
      attachPushListeners((data) => {
        void NotificationService.syncInbox();
        const deepLink = typeof data?.deepLink === 'string' ? data.deepLink : undefined;
        void openNotificationDeepLink(deepLink);
      }),
    );

    teardownFns.push(
      attachForegroundListener((notification) => {
        const data = notification.request.content.data as Record<string, unknown>;
        const title = notification.request.content.title ?? '';
        const body = notification.request.content.body ?? '';
        const deepLink = typeof data?.deepLink === 'string' ? data.deepLink : undefined;

        void NotificationService.syncInbox();

        store.showBanner({
          title: title || 'Notification',
          message: body,
          priority: 'important',
          deepLink,
          actions: deepLink
            ? [{ label: 'Open', onPress: () => void openNotificationDeepLink(deepLink) }]
            : undefined,
        });
      }),
    );

    const receivedSub = Notifications.addNotificationReceivedListener(() => {
      void NotificationService.syncInbox();
    });
    teardownFns.push(() => receivedSub.remove());

    // Either this or PushRegistrationHead may run first; both may prompt, and
    // the undetermined-only guard means exactly one of them ever will.
    await ensurePushDeviceRegistered(options.pushEnabled !== false, {
      promptIfUndetermined: true,
    });

    store.setInitialized(true);
    void NotificationService.syncInbox();
  },

  teardown(): void {
    for (const fn of teardownFns) fn();
    teardownFns = [];
    resetPushRegistrationState();
    getNotificationStore().reset();
  },

  async ensurePushRegistration(pushEnabled = true): Promise<void> {
    await ensurePushDeviceRegistered(pushEnabled);
  },

  updatePreferences(prefs: NotificationPreferences): void {
    getNotificationStore().setServerPrefs(prefs);
  },

  updateExtendedPreferences(prefs: ExtendedCategoryPreferences): void {
    saveExtendedPrefs(prefs);
    getNotificationStore().setExtendedPrefs(prefs);
  },

  getExtendedPreferences(): ExtendedCategoryPreferences {
    return getExtendedPrefs();
  },

  /** Primary entry point for all client-side notifications. */
  notify(input: NotificationInput): string {
    const id = createId();
    const notification: AppNotification = {
      id,
      type: input.type,
      category: input.category,
      priority: input.priority,
      title: input.title,
      message: input.message,
      createdAt: new Date().toISOString(),
      read: false,
      deepLink: input.deepLink,
      action: input.action,
      payload: input.payload,
      source: 'local',
    };

    const channels = resolveDeliveryChannels(
      input.priority,
      input.category,
      getPrefs(),
      getExtendedPrefs(),
      { force: input.force },
    );

    deliverNotification(notification, channels);
    return id;
  },

  notifyError(
    code: ErrorNotificationCode,
    options?: { message?: string; retry?: () => void; details?: string },
  ): string {
    const messages: Record<ErrorNotificationCode, { title: string; message: string }> = {
      network: { title: 'No connection', message: 'Check your internet connection' },
      auth_expired: { title: 'Session expired', message: 'Sign in again to continue' },
      permission_denied: { title: 'Access denied', message: "You don't have permission for this action" },
      upload_failed: { title: 'Upload failed', message: 'Could not upload the file' },
      download_failed: { title: 'Download failed', message: 'Could not download the file' },
      server_unavailable: { title: 'Server unavailable', message: 'Try again later' },
      unexpected: { title: 'Unexpected error', message: 'Something went wrong' },
    };

    const copy = messages[code];
    const store = getNotificationStore();
    const message = options?.message ?? copy.message;

    const actions: Array<{ label: string; onPress: () => void }> = [];
    if (options?.retry) {
      actions.push({ label: 'Retry', onPress: options.retry });
    }
    if (options?.details) {
      actions.push({
        label: 'Details',
        onPress: () => {
          store.showBanner({
            title: copy.title,
            message: options.details!,
            priority: 'warning',
            autoDismissMs: 10000,
          });
        },
      });
    }
    actions.push({ label: 'Dismiss', onPress: () => {} });

    store.showBanner({
      title: copy.title,
      message,
      priority: 'critical',
      actions,
      autoDismissMs: 8000,
    });

    return this.notify({
      type: `error.${code}`,
      category: 'system',
      priority: 'important',
      title: copy.title,
      message,
      force: true,
      action: options?.retry
        ? { label: 'Retry', type: 'retry', payload: { code } }
        : undefined,
    });
  },

  notifySync(event: SyncNotificationEvent): void {
    const channels = resolveSyncChannels(event.type);
    const store = getNotificationStore();

    if (event.type === 'synced') {
      if (channels.toast) {
        void import('@/components/ui/toast-store').then(({ toast }) => {
          toast({ title: 'All changes saved', variant: 'success', duration: 3000 });
        });
      }
      return;
    }

    if (event.type === 'failed') {
      store.showBanner({
        title: 'Some changes are still on this phone',
        message: event.error ?? 'They will be sent again on their own.',
        priority: 'warning',
        actions: event.retry
          ? [{ label: 'Retry', onPress: event.retry }]
          : undefined,
      });
      if (channels.local) {
        void scheduleLocalNotification({
          id: 'sync-failed',
          title: 'Some changes are still on this phone',
          body: event.error ?? 'They will be sent again on their own.',
          data: { type: 'sync.failed' },
        });
      }
      this.notify({
        type: 'sync.failed',
        category: 'sync',
        priority: 'silent',
        title: 'Some changes are still on this phone',
        message: event.error ?? 'They will be sent again on their own.',
      });
      return;
    }

    if (event.type === 'conflict') {
      const deepLink = 'autocoremobile://sync/conflict';
      store.showBanner({
        title: 'Data conflict',
        message: 'Conflicting changes were found. Resolution required.',
        priority: 'critical',
        deepLink,
        actions: [
          {
            label: 'Resolve',
            onPress: () => void openNotificationDeepLink(deepLink),
          },
        ],
      });
      if (channels.local) {
        void scheduleLocalNotification({
          id: 'sync-conflict',
          title: 'Data conflict',
          body: 'Conflicting changes were found. Resolution required.',
          data: { deepLink, type: 'sync.conflict' },
        });
      }
    }
  },

  notifyImportProgress(progress: ImportProgressNotification): void {
    const store = getNotificationStore();
    store.setImportProgress(progress);

    const stageLabels: Record<ImportProgressNotification['stage'], string> = {
      preparing: 'Preparing…',
      uploading: 'Uploading…',
      analyzing: 'Analyzing…',
      importing: 'Importing…',
      completed: 'Import complete',
      failed: 'Import failed',
      partial: 'Import partially complete',
    };

    if (progress.stage === 'completed') {
      store.clearImportProgress(progress.importId);
      this.notify({
        type: 'import.completed',
        category: 'import',
        priority: 'important',
        title: progress.title ?? 'Import complete',
        message: progress.message ?? 'Data is ready to review',
        deepLink: progress.deepLink ?? buildImportDeepLink(progress.importId),
      });
      return;
    }

    if (progress.stage === 'failed' || progress.stage === 'partial') {
      store.clearImportProgress(progress.importId);
      this.notify({
        type: progress.stage === 'failed' ? 'import.failed' : 'import.partial',
        category: 'import',
        priority: progress.stage === 'failed' ? 'important' : 'normal',
        title: progress.title ?? stageLabels[progress.stage],
        message: progress.error ?? progress.message ?? '',
        deepLink: progress.deepLink,
      });
      return;
    }

    store.showBanner({
      title: progress.title ?? 'Data import',
      message: stageLabels[progress.stage],
      priority: 'warning',
      autoDismissMs: 3000,
    });
  },

  notifyOrderLiveEditing(orderId: string, editorName: string): void {
    const channels = resolveLiveEditingChannels();
    const notification: AppNotification = {
      id: createId(),
      type: ORDER_EVENTS.LIVE_EDITING,
      category: 'order',
      priority: 'normal',
      title: 'Work order being edited',
      message: `${editorName} is currently editing this work order`,
      createdAt: new Date().toISOString(),
      read: false,
      deepLink: buildOrderDeepLink(orderId),
      source: 'local',
    };
    deliverNotification(notification, channels);
  },

  toastSuccess(title: string, description?: string): void {
    void import('@/components/ui/toast-store').then(({ toast }) => {
      toast({ title, description, variant: 'success' });
    });
  },

  toastUndo(title: string, onUndo: () => void, description?: string): void {
    void import('@/components/ui/toast-store').then(({ toast }) => {
      toast({
        title,
        description,
        variant: 'default',
        action: { label: 'Undo', onPress: onUndo },
        duration: 6000,
      });
    });
  },

  toastInfo(title: string, description?: string): void {
    void import('@/components/ui/toast-store').then(({ toast }) => {
      toast({ title, description, variant: 'default' });
    });
  },

  async backfillTeamHistory(): Promise<{ created: number }> {
    const { backfillTeamNotifications } = await import('@/services/api/notification-api');
    const result = await backfillTeamNotifications();
    await this.syncInbox();
    return { created: result.created };
  },

  async syncInbox(): Promise<void> {
    const store = getNotificationStore();
    store.setSyncing(true);
    store.setLoading(true);
    store.setError(null);
    try {
      const { items, unreadCount } = await syncInboxFromServer();
      const { slice, hasMore } = paginateItems(items, store.page);
      store.setItems(slice, unreadCount);
      store.setHasMore(hasMore);
      await setBadgeCount(unreadCount);
    } catch (error) {
      const cache = loadInboxCache();
      const message =
        error instanceof MobileApiError
          ? error.message
          : 'Could not load notifications';

      if (cache.items.length === 0) {
        store.setError(message);
      } else {
        store.setError(null);
      }
      hydrateFromCache();
    } finally {
      store.setSyncing(false);
      store.setLoading(false);
    }
  },

  loadMore(): void {
    const store = getNotificationStore();
    const cache = loadInboxCache();
    const nextPage = store.page + 1;
    const { slice, hasMore } = paginateItems(cache.items, nextPage);
    store.setPage(nextPage);
    store.setItems(slice, cache.unreadCount);
    store.setHasMore(hasMore);
  },

  async markRead(id: string): Promise<void> {
    const cache = loadInboxCache();
    const item = cache.items.find((n) => n.id === id);
    const next = markNotificationReadInCache(cache, id);
    saveInboxCache(next);

    const store = getNotificationStore();
    const { slice, hasMore } = paginateItems(next.items, store.page);
    store.setItems(slice, next.unreadCount);
    store.setHasMore(hasMore);
    await setBadgeCount(next.unreadCount);

    if (item?.source === 'server' || item?.serverId) {
      try {
        await markServerNotificationRead(item.serverId ?? id);
      } catch {
        // Optimistic update already applied
      }
    }
  },

  async markAllRead(): Promise<void> {
    const cache = loadInboxCache();
    const next = markAllReadInCache(cache);
    saveInboxCache(next);

    const store = getNotificationStore();
    const { slice, hasMore } = paginateItems(next.items, store.page);
    store.setItems(slice, 0);
    store.setHasMore(hasMore);
    await setBadgeCount(0);

    try {
      await markAllServerNotificationsRead();
    } catch {
      // Optimistic
    }
  },

  async delete(id: string): Promise<void> {
    const cache = loadInboxCache();
    const item = cache.items.find((n) => n.id === id);
    const next = removeNotificationFromCache(cache, id);
    saveInboxCache(next);

    const store = getNotificationStore();
    const { slice, hasMore } = paginateItems(next.items, store.page);
    store.setItems(slice, next.unreadCount);
    store.setHasMore(hasMore);
    await setBadgeCount(next.unreadCount);

    if (item?.source === 'server' || item?.serverId) {
      try {
        await archiveServerNotification(item.serverId ?? id);
      } catch {
        // Optimistic
      }
    }
  },

  async dismiss(id: string): Promise<void> {
    if (itemIsServer(id)) {
      try {
        await dismissServerNotification(id);
      } catch {
        // ignore
      }
    }
    await this.delete(id);
  },

  open(notification: AppNotification): void {
    if (!notification.read) {
      void this.markRead(notification.id);
    }
    void openNotificationDeepLink(notification.deepLink);
  },

  getFilteredItems(): AppNotification[] {
    const store = getNotificationStore();
    const cache = loadInboxCache();
    let items = cache.items;

    if (store.categoryFilter !== 'all') {
      items = items.filter((n) => n.category === store.categoryFilter);
    }
    if (store.readFilter === 'unread') {
      items = items.filter((n) => !n.read);
    } else if (store.readFilter === 'read') {
      items = items.filter((n) => n.read);
    }
    if (store.searchQuery.trim()) {
      const q = store.searchQuery.trim().toLowerCase();
      items = items.filter(
        (n) =>
          n.title.toLowerCase().includes(q) ||
          n.message.toLowerCase().includes(q) ||
          n.type.toLowerCase().includes(q),
      );
    }
    return items;
  },

  setSearchQuery(query: string): void {
    getNotificationStore().setSearchQuery(query);
  },

  setCategoryFilter(category: AppNotificationCategory | 'all'): void {
    getNotificationStore().setCategoryFilter(category);
  },

  setReadFilter(filter: 'all' | 'unread' | 'read'): void {
    getNotificationStore().setReadFilter(filter);
  },

  updateCategoryChannels(
    category: AppNotificationCategory,
    patch: Partial<{ push: boolean; inApp: boolean; activityFeed: boolean }>,
  ): void {
    const current = getExtendedPrefs();
    const next = {
      ...current,
      [category]: { ...current[category], ...patch },
    };
    saveExtendedPrefs(next);
    getNotificationStore().setExtendedPrefs(next);
  },
};

function itemIsServer(id: string): boolean {
  const cache = loadInboxCache();
  const item = cache.items.find((n) => n.id === id);
  return item?.source === 'server' || Boolean(item?.serverId);
}

export type { NotificationInput, AppNotification, AppNotificationCategory, AppNotificationPriority };
