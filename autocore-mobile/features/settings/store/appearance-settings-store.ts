import AsyncStorage from '@react-native-async-storage/async-storage';
import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';

import type { AccentColorId, AppearanceSettings } from '../types';

type AppearanceSettingsState = AppearanceSettings & {
  hydrated: boolean;
  setHydrated: (value: boolean) => void;
  setAccentColor: (color: AccentColorId) => void;
  setAnimationsEnabled: (value: boolean) => void;
  setCompactMode: (value: boolean) => void;
  setLargeText: (value: boolean) => void;
  reset: () => void;
};

const DEFAULT_APPEARANCE: AppearanceSettings = {
  accentColor: 'blue',
  animationsEnabled: true,
  compactMode: false,
  largeText: false,
};

export const ACCENT_COLORS: Record<AccentColorId, { label: string; hex: string }> = {
  blue: { label: 'Blue', hex: '#2563eb' },
  violet: { label: 'Violet', hex: '#7c3aed' },
  emerald: { label: 'Emerald', hex: '#059669' },
  amber: { label: 'Amber', hex: '#d97706' },
  rose: { label: 'Rose', hex: '#e11d48' },
};

export const useAppearanceSettingsStore = create<AppearanceSettingsState>()(
  persist(
    (set) => ({
      ...DEFAULT_APPEARANCE,
      hydrated: false,
      setHydrated: (value) => set({ hydrated: value }),
      setAccentColor: (accentColor) => set({ accentColor }),
      setAnimationsEnabled: (animationsEnabled) => set({ animationsEnabled }),
      setCompactMode: (compactMode) => set({ compactMode }),
      setLargeText: (largeText) => set({ largeText }),
      reset: () => set({ ...DEFAULT_APPEARANCE }),
    }),
    {
      name: 'autocore-appearance-settings',
      storage: createJSONStorage(() => AsyncStorage),
      onRehydrateStorage: () => (state) => {
        state?.setHydrated(true);
      },
      partialize: (state) => ({
        accentColor: state.accentColor,
        animationsEnabled: state.animationsEnabled,
        compactMode: state.compactMode,
        largeText: state.largeText,
      }),
    },
  ),
);
