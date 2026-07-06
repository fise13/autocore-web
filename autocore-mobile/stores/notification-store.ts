import { create } from 'zustand';

import type { NotificationPreferences } from '@/types/notifications';
import { DEFAULT_NOTIFICATION_PREFERENCES } from '@/types/notifications';

import type {
  AppNotification,
  AppNotificationCategory,
  ExtendedCategoryPreferences,
  ImportProgressNotification,
} from '@/services/notifications/types';
import { DEFAULT_EXTENDED_CATEGORY_PREFS } from '@/services/notifications/types';

export type InAppBanner = {
  id: string;
  title: string;
  message: string;
  priority: 'critical' | 'important' | 'warning';
  deepLink?: string;
  actions?: Array<{ label: string; onPress: () => void }>;
  autoDismissMs?: number;
};

type NotificationStore = {
  initialized: boolean;
  items: AppNotification[];
  unreadCount: number;
  loading: boolean;
  syncing: boolean;
  error: string | null;
  page: number;
  hasMore: boolean;
  banners: InAppBanner[];
  importProgress: Map<string, ImportProgressNotification>;
  serverPrefs: NotificationPreferences;
  extendedPrefs: ExtendedCategoryPreferences;
  searchQuery: string;
  categoryFilter: AppNotificationCategory | 'all';
  readFilter: 'all' | 'unread' | 'read';

  setInitialized: (value: boolean) => void;
  setItems: (items: AppNotification[], unreadCount: number) => void;
  setLoading: (value: boolean) => void;
  setSyncing: (value: boolean) => void;
  setError: (error: string | null) => void;
  setPage: (page: number) => void;
  setHasMore: (value: boolean) => void;
  setServerPrefs: (prefs: NotificationPreferences) => void;
  setExtendedPrefs: (prefs: ExtendedCategoryPreferences) => void;
  setSearchQuery: (query: string) => void;
  setCategoryFilter: (category: AppNotificationCategory | 'all') => void;
  setReadFilter: (filter: 'all' | 'unread' | 'read') => void;
  showBanner: (banner: Omit<InAppBanner, 'id'>) => string;
  dismissBanner: (id: string) => void;
  setImportProgress: (progress: ImportProgressNotification) => void;
  clearImportProgress: (importId: string) => void;
  reset: () => void;
};

const initialState = {
  initialized: false,
  items: [] as AppNotification[],
  unreadCount: 0,
  loading: false,
  syncing: false,
  error: null as string | null,
  page: 0,
  hasMore: false,
  banners: [] as InAppBanner[],
  importProgress: new Map<string, ImportProgressNotification>(),
  serverPrefs: DEFAULT_NOTIFICATION_PREFERENCES,
  extendedPrefs: DEFAULT_EXTENDED_CATEGORY_PREFS,
  searchQuery: '',
  categoryFilter: 'all' as const,
  readFilter: 'all' as const,
};

export const useNotificationStore = create<NotificationStore>((set, get) => ({
  ...initialState,

  setInitialized: (value) => set({ initialized: value }),
  setItems: (items, unreadCount) => set({ items, unreadCount }),
  setLoading: (value) => set({ loading: value }),
  setSyncing: (value) => set({ syncing: value }),
  setError: (error) => set({ error }),
  setPage: (page) => set({ page }),
  setHasMore: (value) => set({ hasMore: value }),
  setServerPrefs: (prefs) => set({ serverPrefs: prefs }),
  setExtendedPrefs: (prefs) => set({ extendedPrefs: prefs }),
  setSearchQuery: (query) => set({ searchQuery: query, page: 0 }),
  setCategoryFilter: (category) => set({ categoryFilter: category, page: 0 }),
  setReadFilter: (filter) => set({ readFilter: filter, page: 0 }),

  showBanner: (banner) => {
    const id = `banner-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
    set((state) => ({ banners: [...state.banners, { ...banner, id }] }));
    const dismissMs = banner.autoDismissMs ?? (banner.priority === 'critical' ? 8000 : 5000);
    setTimeout(() => get().dismissBanner(id), dismissMs);
    return id;
  },

  dismissBanner: (id) =>
    set((state) => ({ banners: state.banners.filter((b) => b.id !== id) })),

  setImportProgress: (progress) =>
    set((state) => {
      const next = new Map(state.importProgress);
      next.set(progress.importId, progress);
      return { importProgress: next };
    }),

  clearImportProgress: (importId) =>
    set((state) => {
      const next = new Map(state.importProgress);
      next.delete(importId);
      return { importProgress: next };
    }),

  reset: () => set({ ...initialState, importProgress: new Map() }),
}));

export function getNotificationStore() {
  return useNotificationStore.getState();
}
