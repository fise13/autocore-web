import { createContext, useContext, useMemo } from 'react';
import { useColorScheme as useSystemColorScheme } from 'react-native';

import {
  type ColorScheme,
  type SemanticColors,
  getColors,
  getGradients,
  getElevation,
  getShadows,
  ringBorder,
} from '@/theme';

type ThemeContextValue = {
  scheme: ColorScheme;
  colors: SemanticColors;
  gradients: ReturnType<typeof getGradients>;
  elevation: ReturnType<typeof getElevation>;
  shadows: ReturnType<typeof getShadows>;
  ring: ReturnType<typeof ringBorder>;
  isDark: boolean;
};

const ThemeContext = createContext<ThemeContextValue | null>(null);

type ThemeProviderProps = {
  children: React.ReactNode;
  forcedScheme?: ColorScheme;
};

export function ThemeProvider({ children, forcedScheme }: ThemeProviderProps) {
  const systemScheme = useSystemColorScheme();
  const scheme: ColorScheme = forcedScheme ?? (systemScheme === 'dark' ? 'dark' : 'light');

  const value = useMemo<ThemeContextValue>(() => {
    const colors = getColors(scheme);
    return {
      scheme,
      colors,
      gradients: getGradients(scheme),
      elevation: getElevation(scheme),
      shadows: getShadows(scheme),
      ring: ringBorder(scheme),
      isDark: scheme === 'dark',
    };
  }, [scheme]);

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export function useTheme(): ThemeContextValue {
  const ctx = useContext(ThemeContext);
  if (!ctx) {
    throw new Error('useTheme must be used within ThemeProvider');
  }
  return ctx;
}
