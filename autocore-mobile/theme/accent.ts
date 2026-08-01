import type { AccentColorId } from '@/features/settings/types';
import type { SemanticColors } from './colors';

/** Accent overrides for ThemeProvider — keeps primaryForeground white for contrast. */
const ACCENT_PALETTE: Record<
  AccentColorId,
  { light: Pick<SemanticColors, 'primary' | 'primaryHover' | 'primaryPressed' | 'primarySubtle' | 'primaryOnSubtle' | 'primaryBorder'>; dark: Pick<SemanticColors, 'primary' | 'primaryHover' | 'primaryPressed' | 'primarySubtle' | 'primaryOnSubtle' | 'primaryBorder'> }
> = {
  blue: {
    light: {
      primary: '#2563eb',
      primaryHover: '#1d4ed8',
      primaryPressed: '#1e40af',
      primarySubtle: '#dbeafe',
      primaryOnSubtle: '#1d4ed8',
      primaryBorder: '#bfdbfe',
    },
    dark: {
      primary: '#60a5fa',
      primaryHover: '#93c5fd',
      primaryPressed: '#3b82f6',
      primarySubtle: '#1e293b',
      primaryOnSubtle: '#93c5fd',
      primaryBorder: '#1e3a5f',
    },
  },
  violet: {
    light: {
      primary: '#7c3aed',
      primaryHover: '#6d28d9',
      primaryPressed: '#5b21b6',
      primarySubtle: '#ede9fe',
      primaryOnSubtle: '#6d28d9',
      primaryBorder: '#ddd6fe',
    },
    dark: {
      primary: '#a78bfa',
      primaryHover: '#c4b5fd',
      primaryPressed: '#8b5cf6',
      primarySubtle: '#2e1065',
      primaryOnSubtle: '#c4b5fd',
      primaryBorder: '#4c1d95',
    },
  },
  emerald: {
    light: {
      primary: '#059669',
      primaryHover: '#047857',
      primaryPressed: '#065f46',
      primarySubtle: '#d1fae5',
      primaryOnSubtle: '#047857',
      primaryBorder: '#a7f3d0',
    },
    dark: {
      primary: '#34d399',
      primaryHover: '#6ee7b7',
      primaryPressed: '#10b981',
      primarySubtle: '#064e3b',
      primaryOnSubtle: '#6ee7b7',
      primaryBorder: '#065f46',
    },
  },
  amber: {
    light: {
      primary: '#d97706',
      primaryHover: '#b45309',
      primaryPressed: '#92400e',
      primarySubtle: '#fef3c7',
      primaryOnSubtle: '#b45309',
      primaryBorder: '#fde68a',
    },
    dark: {
      primary: '#fbbf24',
      primaryHover: '#fcd34d',
      primaryPressed: '#f59e0b',
      primarySubtle: '#451a03',
      primaryOnSubtle: '#fcd34d',
      primaryBorder: '#78350f',
    },
  },
  rose: {
    light: {
      primary: '#e11d48',
      primaryHover: '#be123c',
      primaryPressed: '#9f1239',
      primarySubtle: '#ffe4e6',
      primaryOnSubtle: '#be123c',
      primaryBorder: '#fecdd3',
    },
    dark: {
      primary: '#fb7185',
      primaryHover: '#fda4af',
      primaryPressed: '#f43f5e',
      primarySubtle: '#4c0519',
      primaryOnSubtle: '#fda4af',
      primaryBorder: '#881337',
    },
  },
};

export function applyAccentToColors(
  colors: SemanticColors,
  scheme: 'light' | 'dark',
  accent: AccentColorId,
): SemanticColors {
  const patch = ACCENT_PALETTE[accent][scheme];
  return {
    ...colors,
    ...patch,
    primaryForeground: scheme === 'dark' && accent === 'amber' ? '#0d0e12' : '#ffffff',
  };
}
