import type { ColorScheme } from '@/theme/colors';
import { getColors } from '@/theme/colors';
import { toneBackground, withAlpha } from '@/theme/color-utils';
import { getShadows } from '@/theme/shadow';
import type { ViewStyle } from 'react-native';

export type OAuthProvider = 'google' | 'apple';

export type OAuthButtonTheme = {
  backgroundColor: string;
  pressedBackgroundColor: string;
  foregroundColor: string;
  borderColor: string;
  shadow: ViewStyle;
};

/** Mirrors web `.auth-oauth-button-*` in globals.css */
export function getOAuthButtonTheme(
  provider: OAuthProvider,
  scheme: ColorScheme,
): OAuthButtonTheme {
  const colors = getColors(scheme);
  const isDark = scheme === 'dark';
  const shadows = getShadows(scheme);

  if (provider === 'google') {
    const backgroundColor = isDark ? toneBackground(colors.card, 0.92) : '#ffffff';
    return {
      backgroundColor,
      pressedBackgroundColor: isDark ? toneBackground(colors.muted, 0.7) : '#fafafa',
      foregroundColor: isDark ? colors.foreground : '#1f1f1f',
      borderColor: isDark ? colors.border : withAlpha(colors.border, 0.85),
      shadow: shadows.xs,
    };
  }

  return {
    backgroundColor: isDark ? '#ffffff' : '#000000',
    pressedBackgroundColor: isDark ? '#f5f5f7' : '#111111',
    foregroundColor: isDark ? '#000000' : '#ffffff',
    borderColor: 'transparent',
    shadow: shadows.xs,
  };
}
