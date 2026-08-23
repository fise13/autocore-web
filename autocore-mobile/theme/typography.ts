import { Platform, type TextStyle } from 'react-native';

/**
 * Typography — Claude/Notion quiet sans (DL v3).
 * iOS uses SF Pro via System; Android uses the platform sans.
 * Optical tracking is tighter on display sizes, slightly open on captions.
 */
export const fontFamily = {
  sans: Platform.select({ ios: 'System', android: 'sans-serif', default: 'System' }) ?? 'System',
  mono: Platform.select({ ios: 'Menlo', android: 'monospace', default: 'monospace' }) ?? 'monospace',
  system: Platform.select({ ios: 'System', android: 'sans-serif', default: 'System' }) ?? 'System',
} as const;

export const fontWeight = {
  regular: '400' as const,
  medium: '500' as const,
  semibold: '600' as const,
  bold: '700' as const,
  extrabold: '800' as const,
};

const tracking = {
  tighter: -0.45,
  tight: -0.28,
  snug: -0.18,
  normal: -0.08,
  open: 0.12,
  wide: 0.28,
} as const;

const largeTitle = {
  fontSize: 34,
  fontWeight: fontWeight.bold,
  lineHeight: 41,
  letterSpacing: tracking.tighter,
} as const;

const title1 = {
  fontSize: 28,
  fontWeight: fontWeight.bold,
  lineHeight: 34,
  letterSpacing: tracking.tighter,
} as const;

const title2 = {
  fontSize: 22,
  fontWeight: fontWeight.semibold,
  lineHeight: 28,
  letterSpacing: tracking.tight,
} as const;

const title3 = {
  fontSize: 20,
  fontWeight: fontWeight.semibold,
  lineHeight: 25,
  letterSpacing: tracking.tight,
} as const;

const headline = {
  fontSize: 17,
  fontWeight: fontWeight.semibold,
  lineHeight: 22,
  letterSpacing: tracking.snug,
} as const;

const body = {
  fontSize: 17,
  fontWeight: fontWeight.regular,
  lineHeight: 22,
  letterSpacing: tracking.snug,
} as const;

const callout = {
  fontSize: 16,
  fontWeight: fontWeight.regular,
  lineHeight: 21,
  letterSpacing: tracking.snug,
} as const;

const subheadline = {
  fontSize: 15,
  fontWeight: fontWeight.regular,
  lineHeight: 20,
  letterSpacing: tracking.normal,
} as const;

const footnote = {
  fontSize: 13,
  fontWeight: fontWeight.regular,
  lineHeight: 18,
  letterSpacing: tracking.normal,
} as const;

const caption1 = {
  fontSize: 12,
  fontWeight: fontWeight.regular,
  lineHeight: 16,
  letterSpacing: tracking.open,
} as const;

const caption2 = {
  fontSize: 11,
  fontWeight: fontWeight.regular,
  lineHeight: 13,
  letterSpacing: tracking.open,
} as const;

const metric = {
  fontSize: 28,
  fontWeight: fontWeight.semibold,
  lineHeight: 34,
  letterSpacing: tracking.tight,
  fontVariant: ['tabular-nums'] as TextStyle['fontVariant'],
} as const;

/** Section labels — sentence case, quiet (Claude settings). Never uppercase. */
const sectionLabel = {
  fontSize: 13,
  fontWeight: fontWeight.medium,
  lineHeight: 18,
  letterSpacing: tracking.normal,
} as const;

/**
 * Home greeting — the one line on the screen that is a voice, not a label.
 *
 * SF Pro Display, reached the way iOS intends: no `fontFamily` is set here, so
 * `Text` supplies the platform sans and iOS's optical sizing serves Display
 * automatically above ~20pt. Nothing proprietary is bundled and nothing here
 * needs a font file.
 *
 * The character is carried by weight, not size. `medium` is the pivot — at 700
 * the same 36pt is a masthead shouting the app's name, at 400 it thins out into
 * body copy, and at 500 it settles into someone speaking. Nothing else in the
 * scale sits at medium above 17pt, so this is a genuinely new register rather
 * than a collision with `title1`. Leading is opened past the display default so
 * a two-line greeting breathes, and tracking is closed slightly, which display
 * sizes want anyway. No shadow, no gradient, no rounded face, no uppercase.
 */
const greeting = {
  fontSize: 36,
  fontWeight: fontWeight.medium,
  lineHeight: 44,
  letterSpacing: tracking.tighter,
} as const;

/** Serials, VINs, location codes — monospace identifier. */
const identifier = {
  fontSize: 15,
  fontWeight: fontWeight.medium,
  lineHeight: 20,
  letterSpacing: 0.4,
  fontFamily: fontFamily.mono,
} as const;

/**
 * Typography scale — HIG semantic names are canonical.
 * Legacy aliases resolve onto the same objects (no second scale).
 */
export const typography = {
  largeTitle,
  title1,
  title2,
  title3,
  headline,
  body,
  callout,
  subheadline,
  footnote,
  caption1,
  caption2,
  metric,
  greeting,
  sectionLabel,
  identifier,

  // —— Legacy aliases → semantic (do not invent new sizes) ——
  display: largeTitle,
  displayTitle: largeTitle,
  pageTitle: title1,
  title: title2,
  heading: headline,
  pageSubtitle: subheadline,
  bodyStrong: headline,
  bodyLarge: body,
  meta: caption1,
  caption: caption1,
  /** @deprecated Prefer sectionLabel — sentence case, no uppercase stamp */
  label: sectionLabel,
  small: footnote,
  button: headline,
  buttonSmall: {
    fontSize: 15,
    fontWeight: fontWeight.semibold,
    lineHeight: 20,
    letterSpacing: tracking.normal,
  },
  kpi: metric,
} as const;

export type TypographyVariant = keyof typeof typography;
