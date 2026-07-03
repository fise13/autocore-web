import AsyncStorage from '@react-native-async-storage/async-storage';
import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';

import {
  DEFAULT_NAV_ENABLED,
  DEFAULT_NAV_ORDER,
  MORE_TAB_ID,
  NAV_ITEM_DEFINITIONS,
} from '../data/navigation-items';
import { settingsLayout } from '../layout';
import type { NavItemConfig, NavItemId } from '../types';

type NavigationConfigState = {
  order: NavItemId[];
  enabled: Record<NavItemId, boolean>;
  hydrated: boolean;
  setHydrated: (value: boolean) => void;
  toggleItem: (id: NavItemId) => void;
  moveItem: (fromIndex: number, toIndex: number) => void;
  reset: () => void;
};

function buildEnabledMap(): Record<NavItemId, boolean> {
  return { ...DEFAULT_NAV_ENABLED };
}

export const useNavigationConfigStore = create<NavigationConfigState>()(
  persist(
    (set, get) => ({
      order: [...DEFAULT_NAV_ORDER],
      enabled: buildEnabledMap(),
      hydrated: false,
      setHydrated: (value) => set({ hydrated: value }),
      toggleItem: (id) =>
        set((state) => ({
          enabled: { ...state.enabled, [id]: !state.enabled[id] },
        })),
      moveItem: (fromIndex, toIndex) =>
        set((state) => {
          const next = [...state.order];
          const [item] = next.splice(fromIndex, 1);
          if (!item) return state;
          next.splice(toIndex, 0, item);
          return { order: next };
        }),
      reset: () => set({ order: [...DEFAULT_NAV_ORDER], enabled: buildEnabledMap() }),
    }),
    {
      name: 'autocore-nav-config',
      storage: createJSONStorage(() => AsyncStorage),
      version: 2,
      migrate: (persisted, version) => {
        const state = persisted as Pick<NavigationConfigState, 'order' | 'enabled'> | undefined;
        if (!state || typeof state !== 'object') return persisted;
        if (version < 2) {
          return {
            ...state,
            enabled: {
              ...state.enabled,
              accounting: true,
            },
          };
        }
        return state;
      },
      onRehydrateStorage: () => (state) => {
        state?.setHydrated(true);
      },
      partialize: (state) => ({ order: state.order, enabled: state.enabled }),
    },
  ),
);

export type ResolvedTabItem =
  | { type: 'nav'; id: NavItemId }
  | { type: 'more'; ids: NavItemId[] };

export function resolveVisibleTabs(
  order: NavItemId[],
  enabled: Record<NavItemId, boolean>,
): ResolvedTabItem[] {
  const active = order.filter((id) => enabled[id]);

  if (active.length <= settingsLayout.maxVisibleTabs) {
    return active.map((id) => ({ type: 'nav', id }));
  }

  const primary = active.slice(0, settingsLayout.maxPrimaryTabs);
  const overflow = active.slice(settingsLayout.maxPrimaryTabs);

  return [
    ...primary.map((id) => ({ type: 'nav' as const, id })),
    { type: 'more' as const, ids: overflow },
  ];
}

export function getNavItemTitle(id: NavItemId): string {
  return NAV_ITEM_DEFINITIONS[id].title;
}

export function getNavItemRoute(id: NavItemId): string | undefined {
  return NAV_ITEM_DEFINITIONS[id].route;
}

export { MORE_TAB_ID };
