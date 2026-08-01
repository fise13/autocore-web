import AsyncStorage from '@react-native-async-storage/async-storage';
import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { useColorScheme as useSystemColorScheme } from 'react-native';

import { useAppearanceSettingsStore } from '@/features/settings/store/appearance-settings-store';
import {
  type ColorScheme,
  type SemanticColors,
  getColors,
  getGradients,
  getElevation,
  getShadows,
  ringBorder,
  toneStyles,
} from '@/theme';
import { applyAccentToColors } from '@/theme/accent';

export type ThemePreference = 'light' | 'dark' | 'system';

const STORAGE_KEY = 'autocore-mobile:theme-preference';

type ThemeContextValue = {
  scheme: ColorScheme;
  preference: ThemePreference;
  setPreference: (preference: ThemePreference) => void;
  colors: SemanticColors;
  gradients: ReturnType<typeof getGradients>;
  elevation: ReturnType<typeof getElevation>;
  shadows: ReturnType<typeof getShadows>;
  ring: ReturnType<typeof ringBorder>;
  /** Badge/chip tone pairings — pre-composited, AA-guaranteed. */
  tones: ReturnType<typeof toneStyles>;
  isDark: boolean;
};

const ThemeContext = createContext<ThemeContextValue | null>(null);

type ThemeProviderProps = {
  children: React.ReactNode;
  forcedScheme?: ColorScheme;
};

function resolveScheme(preference: ThemePreference, systemScheme: ColorScheme | null | undefined): ColorScheme {
  if (preference === 'system') {
    return systemScheme === 'dark' ? 'dark' : 'light';
  }
  return preference;
}

export function ThemeProvider({ children, forcedScheme }: ThemeProviderProps) {
  const systemScheme = useSystemColorScheme();
  const [preference, setPreferenceState] = useState<ThemePreference>('system');
  const accentColor = useAppearanceSettingsStore((s) => s.accentColor);

  useEffect(() => {
    void AsyncStorage.getItem(STORAGE_KEY)
      .then((value) => {
        if (value === 'light' || value === 'dark' || value === 'system') {
          setPreferenceState(value);
        }
      });
  }, []);

  const setPreference = useCallback((next: ThemePreference) => {
    setPreferenceState(next);
    void AsyncStorage.setItem(STORAGE_KEY, next);
  }, []);

  const scheme: ColorScheme =
    forcedScheme ?? resolveScheme(preference, systemScheme === 'dark' ? 'dark' : 'light');

  const value = useMemo<ThemeContextValue>(() => {
    const base = getColors(scheme);
    const colors = applyAccentToColors(base, scheme, accentColor);
    return {
      scheme,
      preference,
      setPreference,
      colors,
      gradients: getGradients(scheme),
      elevation: getElevation(scheme),
      shadows: getShadows(scheme),
      ring: ringBorder(scheme),
      tones: toneStyles(scheme),
      isDark: scheme === 'dark',
    };
  }, [accentColor, preference, scheme, setPreference]);

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export function useTheme(): ThemeContextValue {
  const ctx = useContext(ThemeContext);
  if (!ctx) {
    throw new Error('useTheme must be used within ThemeProvider');
  }
  return ctx;
}

export function themePreferenceLabel(preference: ThemePreference): string {
  if (preference === 'light') return 'Light';
  if (preference === 'dark') return 'Dark';
  return 'System';
}
