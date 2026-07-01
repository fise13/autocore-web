/**
 * Shared style factories — eliminates duplicated inline styles across UI components.
 */
import type { TextStyle, ViewStyle } from 'react-native';

import type { ColorScheme, SemanticColors } from './colors';
import {
  borderStyle,
  buttonHeight,
  cornerStyle,
  defaultShadow,
  layoutRhythm,
  touchTarget,
  toneStyles,
} from './design-language';
import { withAlpha } from './color-utils';
import { ringBorder } from './shadow';
import { spacing } from './spacing';
import { typography } from './typography';

type ThemeSlice = {
  scheme: ColorScheme;
  colors: SemanticColors;
};

export function createInputStyle({ colors }: ThemeSlice, options?: { invalid?: boolean; large?: boolean }): ViewStyle {
  return {
    height: options?.large ? buttonHeight.xl : buttonHeight.default,
    width: '100%',
    borderRadius: cornerStyle.control,
    borderWidth: 1,
    borderColor: options?.invalid ? colors.destructive : colors.input,
    backgroundColor: colors.background,
    paddingHorizontal: spacing[2.5],
  };
}

import { fontFamily } from './typography';

export function createInputTextStyle({ colors }: ThemeSlice): TextStyle {
  return {
    fontSize: typography.body.fontSize,
    fontFamily: fontFamily.sans,
    color: colors.foreground,
  };
}

export function createCardStyle(theme: ThemeSlice, size: 'default' | 'sm' = 'default'): ViewStyle {
  const padding = size === 'sm' ? layoutRhythm.cardPaddingSm : layoutRhythm.cardPadding;
  return {
    backgroundColor: theme.colors.card,
    borderRadius: cornerStyle.card,
    padding,
    gap: layoutRhythm.cardGap,
    ...ringBorder(theme.scheme),
    ...defaultShadow(theme.scheme),
  };
}

export function createSurfaceCardStyle(theme: ThemeSlice): ViewStyle {
  return {
    ...createCardStyle(theme),
    borderWidth: 1,
    borderColor: withAlpha(theme.colors.border, 0.55),
  };
}

export function createPressableControlStyle(
  theme: ThemeSlice,
  variant: 'outline' | 'secondary' | 'ghost' | 'primary' | 'destructive',
): ViewStyle {
  const { colors } = theme;
  const borders = borderStyle(theme.scheme);
  switch (variant) {
    case 'outline':
      return { backgroundColor: colors.background, ...borders.default };
    case 'secondary':
      return { backgroundColor: colors.secondary };
    case 'ghost':
      return { backgroundColor: 'transparent' };
    case 'destructive':
      return { backgroundColor: withAlpha(colors.destructive, 0.1) };
    default:
      return { backgroundColor: colors.primary };
  }
}

export function createIconBadgeStyle(
  theme: ThemeSlice,
  tone: keyof ReturnType<typeof toneStyles> = 'primary',
): ViewStyle {
  const tones = toneStyles(theme.scheme);
  const t = tones[tone];
  return {
    width: touchTarget.icon,
    height: touchTarget.icon,
    borderRadius: cornerStyle.control,
    backgroundColor: t.bg,
    borderWidth: 1,
    borderColor: t.border,
    alignItems: 'center',
    justifyContent: 'center',
  };
}

export function createListRowStyle(theme: ThemeSlice): ViewStyle {
  const { colors } = theme;
  return {
    borderWidth: 1,
    borderColor: colors.borderMuted,
    borderRadius: cornerStyle.sm,
    backgroundColor: withAlpha(colors.background, 0.55),
    paddingHorizontal: spacing[3],
    paddingVertical: spacing[2.5],
  };
}

export function createSegmentedTrackStyle(theme: ThemeSlice): ViewStyle {
  const { colors } = theme;
  return {
    flexDirection: 'row',
    height: touchTarget.comfortable,
    borderRadius: cornerStyle.control,
    backgroundColor: withAlpha(colors.muted, 0.8),
    borderWidth: 1,
    borderColor: withAlpha(colors.border, 0.75),
    padding: spacing[0.5],
  };
}

export function createChipStyle(theme: ThemeSlice, selected: boolean): ViewStyle {
  const { colors } = theme;
  return {
    height: 28,
    paddingHorizontal: spacing[2],
    borderRadius: cornerStyle.chip,
    backgroundColor: selected ? colors.primary : colors.secondary,
    borderWidth: 1,
    borderColor: selected ? colors.primary : colors.border,
    alignItems: 'center',
    justifyContent: 'center',
  };
}

export function createDisabledOpacity(disabled?: boolean): ViewStyle {
  return disabled ? { opacity: 0.5 } : {};
}
