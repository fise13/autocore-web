import AsyncStorage from '@react-native-async-storage/async-storage';
import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';

import { DEFAULT_MODULE_ENABLED, MODULE_ORDER } from '../data/modules';
import type { ProductModuleId } from '../types';

type ModulesConfigState = {
  enabled: Record<ProductModuleId, boolean>;
  hydrated: boolean;
  setHydrated: (value: boolean) => void;
  toggleModule: (id: ProductModuleId) => void;
  setModuleEnabled: (id: ProductModuleId, value: boolean) => void;
  reset: () => void;
};

export const useModulesConfigStore = create<ModulesConfigState>()(
  persist(
    (set) => ({
      enabled: { ...DEFAULT_MODULE_ENABLED },
      hydrated: false,
      setHydrated: (value) => set({ hydrated: value }),
      toggleModule: (id) =>
        set((state) => ({
          enabled: { ...state.enabled, [id]: !state.enabled[id] },
        })),
      setModuleEnabled: (id, value) =>
        set((state) => ({
          enabled: { ...state.enabled, [id]: value },
        })),
      reset: () => set({ enabled: { ...DEFAULT_MODULE_ENABLED } }),
    }),
    {
      name: 'autocore-modules-config',
      storage: createJSONStorage(() => AsyncStorage),
      onRehydrateStorage: () => (state) => {
        state?.setHydrated(true);
      },
      partialize: (state) => ({ enabled: state.enabled }),
    },
  ),
);

export function isProductModuleEnabled(id: ProductModuleId): boolean {
  return useModulesConfigStore.getState().enabled[id] !== false;
}

export const MODULE_IDS = MODULE_ORDER;
