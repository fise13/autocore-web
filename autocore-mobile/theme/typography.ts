import type { TextStyle } from 'react-native';

export const fontFamily = {
  sans: 'GeistSans',
  mono: 'GeistMono',
  system: 'System',
} as const;

export const fontWeight = {
  regular: '400' as const,
  medium: '500' as const,
  semibold: '600' as const,
  bold: '700' as const,
  extrabold: '800' as const,
};

export const lineHeight = {
  tight: 1.15,
  snug: 1.25,
  normal: 1.45,
  relaxed: 1.55,
  loose: 1.65,
} as const;

export const letterSpacing = {
  tighter: -0.02,
  tight: -0.01,
  normal: 0,
  wide: 0.04,
  wider: 0.08,
  widest: 0.14,
} as const;

/** Typography scale — mirrors Autocore web (Geist Sans) */
export const typography = {
  display: {
    fontSize: 36,
    fontWeight: fontWeight.semibold,
    lineHeight: 40,
    letterSpacing: letterSpacing.tight,
  },
  heading: {
    fontSize: 18,
    fontWeight: fontWeight.medium,
    lineHeight: 24,
    letterSpacing: letterSpacing.tight,
  },
  title: {
    fontSize: 24,
    fontWeight: fontWeight.semibold,
    lineHeight: 30,
    letterSpacing: letterSpacing.tight,
  },
  body: {
    fontSize: 14,
    fontWeight: fontWeight.regular,
    lineHeight: 20,
    letterSpacing: letterSpacing.normal,
  },
  bodyLarge: {
    fontSize: 16,
    fontWeight: fontWeight.regular,
    lineHeight: 24,
    letterSpacing: letterSpacing.normal,
  },
  caption: {
    fontSize: 12,
    fontWeight: fontWeight.regular,
    lineHeight: 16,
    letterSpacing: letterSpacing.normal,
  },
  label: {
    fontSize: 11,
    fontWeight: fontWeight.medium,
    lineHeight: 14,
    letterSpacing: letterSpacing.wider,
    textTransform: 'uppercase' as const,
  },
  small: {
    fontSize: 13,
    fontWeight: fontWeight.regular,
    lineHeight: 18,
    letterSpacing: letterSpacing.normal,
  },
  button: {
    fontSize: 14,
    fontWeight: fontWeight.medium,
    lineHeight: 20,
    letterSpacing: letterSpacing.normal,
  },
  buttonSmall: {
    fontSize: 12,
    fontWeight: fontWeight.medium,
    lineHeight: 16,
    letterSpacing: letterSpacing.normal,
  },
  kpi: {
    fontSize: 24,
    fontWeight: fontWeight.semibold,
    lineHeight: 30,
    letterSpacing: letterSpacing.tight,
    fontVariant: ['tabular-nums'] as TextStyle['fontVariant'],
  },
  sectionLabel: {
    fontSize: 11,
    fontWeight: fontWeight.semibold,
    lineHeight: 14,
    letterSpacing: letterSpacing.wider,
    textTransform: 'uppercase' as const,
  },
} as const;

export type TypographyVariant = keyof typeof typography;
