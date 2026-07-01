import { useMemo } from 'react';

import { useTheme } from './use-theme';
import { useAccessibility } from './use-accessibility';
import {
  designLanguageFromScheme,
  type DesignLanguageContext,
} from '@/theme/design-language-context';

/** Single hook for all design tokens + accessibility */
export function useDesignLanguage(): DesignLanguageContext {
  const theme = useTheme();
  const a11y = useAccessibility();

  return useMemo(
    () => designLanguageFromScheme(theme.scheme, theme.colors, a11y),
    [theme.scheme, theme.colors, a11y.reducedMotion, a11y.fontScale, a11y.highContrast],
  );
}
