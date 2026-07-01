import { Platform, type ViewStyle } from 'react-native';

import type { ColorScheme } from './colors';
import { getColors } from './colors';

/** Shadow presets from globals.css — adapted for RN */
export function getShadows(scheme: ColorScheme) {
  const isDark = scheme === 'dark';
  const shadowColor = isDark ? '#000000' : '#11131a';

  return {
    none: {} as ViewStyle,
    xs: Platform.select<ViewStyle>({
      ios: {
        shadowColor,
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: isDark ? 0.25 : 0.06,
        shadowRadius: 2,
      },
      android: { elevation: 1 },
      default: {},
    })!,
    sm: Platform.select<ViewStyle>({
      ios: {
        shadowColor,
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: isDark ? 0.35 : 0.08,
        shadowRadius: 4,
      },
      android: { elevation: 2 },
      default: {},
    })!,
    soft: Platform.select<ViewStyle>({
      ios: {
        shadowColor: '#000000',
        shadowOffset: { width: 0, height: 8 },
        shadowOpacity: isDark ? 0.22 : 0.1,
        shadowRadius: 24,
      },
      android: { elevation: 6 },
      default: {},
    })!,
    elevated: Platform.select<ViewStyle>({
      ios: {
        shadowColor: '#000000',
        shadowOffset: { width: 0, height: 24 },
        shadowOpacity: isDark ? 0.32 : 0.14,
        shadowRadius: 48,
      },
      android: { elevation: 12 },
      default: {},
    })!,
    card: Platform.select<ViewStyle>({
      ios: {
        shadowColor,
        shadowOffset: { width: 0, height: 8 },
        shadowOpacity: isDark ? 0.2 : 0.06,
        shadowRadius: 24,
      },
      android: { elevation: 4 },
      default: {},
    })!,
    insetHighlight: {
      borderTopWidth: 1,
      borderTopColor: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(255,255,255,0.4)',
    } as ViewStyle,
  };
}

export type ShadowKey = ReturnType<typeof getShadows> extends Record<infer K, unknown> ? K : never;

/** Ring style equivalent to web ring-1 ring-foreground/10 */
export function ringBorder(scheme: ColorScheme): ViewStyle {
  const c = getColors(scheme);
  return {
    borderWidth: 1,
    borderColor: scheme === 'dark' ? 'rgba(245,245,247,0.1)' : 'rgba(17,19,26,0.1)',
  };
}
