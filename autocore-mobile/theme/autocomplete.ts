import { Platform, StyleSheet, type ViewStyle } from 'react-native';
import type { BlurTint } from 'expo-blur';

import type { ColorScheme, SemanticColors } from './colors';
import { withAlpha } from './color-utils';
import { getShadows } from './shadow';
import { tokens } from './tokens';

/**
 * Autocomplete QuickType dock — glass on iOS chips, solid dock on Android.
 *
 * Colours are semantic fills via `withAlpha`. Specular rims live on GlassSheen.
 */
export type AutocompleteGlassTokens = {
  blurTint: BlurTint;
  blurIntensity: number;
  fill: string;
  tint: string;
  hairline: number;
  hairlineColor: string;
  radius: number;
  shadow: ViewStyle;
};

export function autocompleteGlass(
  colors: SemanticColors,
  scheme: ColorScheme,
): AutocompleteGlassTokens {
  const isDark = scheme === 'dark';
  const soft = getShadows(scheme).soft;

  return {
    blurTint: isDark ? 'systemMaterialDark' : 'systemMaterialLight',
    blurIntensity: isDark ? 48 : 64,
    fill: withAlpha(colors.card, isDark ? 0.72 : 0.88),
    tint: withAlpha(colors.card, isDark ? 0.62 : 0.7),
    hairline: StyleSheet.hairlineWidth,
    hairlineColor: withAlpha(colors.foreground, isDark ? 0.15 : 0.08),
    radius: tokens.radius.group,
    shadow: Platform.select<ViewStyle>({
      ios: {
        ...soft,
        shadowOffset: { width: 0, height: 8 },
        shadowOpacity: isDark ? 0.28 : 0.1,
        shadowRadius: 18,
      },
      android: { elevation: 6 },
      default: soft,
    })!,
  };
}

export const autocompleteBorderCurve =
  Platform.OS === 'ios' ? ('continuous' as const) : undefined;
