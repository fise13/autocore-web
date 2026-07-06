import { useNotificationStore } from '@/stores/notification-store';

/** Reactive access to NotificationService state. */
export function useNotificationService() {
  const unreadCount = useNotificationStore((s) => s.unreadCount);
  const loading = useNotificationStore((s) => s.loading);
  const syncing = useNotificationStore((s) => s.syncing);
  const initialized = useNotificationStore((s) => s.initialized);
  const banners = useNotificationStore((s) => s.banners);
  const importProgress = useNotificationStore((s) => s.importProgress);

  return {
    unreadCount,
    loading,
    syncing,
    initialized,
    banners,
    importProgress,
  };
}
