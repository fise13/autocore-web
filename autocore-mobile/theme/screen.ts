/**
 * Unified screen rhythm — every tab and stack screen shares these values.
 * Feature `layout.ts` files must alias this object (no local overrides).
 */
import { radius } from './radius';
import { spacing } from './spacing';
import { spring, duration } from './animations';

/** Unified screen rhythm — do not confuse with breakpoints `screen` dimensions */
export const rhythm = {
  /** Horizontal content inset */
  pad: spacing[5],
  /** Vertical gap between major sections */
  section: spacing[6],
  /** Gap inside cards / stacks */
  stack: spacing[3],
  /** Row / chip gaps */
  inline: spacing[2],
  /** Tight meta gaps */
  tight: spacing[1.5],
  /** Micro gaps (icon + label) */
  micro: spacing[1],

  hairline: 1,

  /** Primary surface radius — web `rounded-xl` (~14px) */
  cardRadius: radius.xl,
  /** Nested / compact surfaces */
  radius: radius.xl,
  /** Sheets, floating panels, tab pill */
  panelRadius: radius['3xl'],
  /** Hero / balance blocks */
  heroRadius: radius['2xl'],

  logo: 36,
  logoSm: 32,
  avatar: 80,
  iconBox: 32,
  iconTile: 28,

  pageTitle: 28,
  pageTitleLineHeight: 34,
  pageSubtitle: 13,
  pageSubtitleLineHeight: 18,
  sectionTitle: 15,
  sectionTitleLineHeight: 20,
  meta: 11,
  metaLineHeight: 14,
  label: 11,
  value: 14,
  valueStrong: 15,

  rowMinHeight: 48,
  actionTile: 80,
  searchHeight: 48,
  chipHeight: 36,
  filterHeight: 34,

  headerTop: spacing[2],
  headerBottom: spacing[3],

  /** Extra scroll padding above floating tab bar (use with useFloatingTabBarInset) */
  tabBarBreathing: spacing[2],

  cardPadX: spacing[3.5],
  cardPadY: spacing[3],
} as const;

/**
 * Shared motion — web-like minimalism.
 * Page enters are off; keep only light press feedback where needed.
 */
export const screenMotion = {
  /** Master switch for enter / stagger animations */
  enabled: false,
  duration: duration.instant,
  translateY: 0,
  stagger: 0,
  spring: spring.gentle,
  press: spring.snappy,
} as const;

export type ScreenTokens = typeof rhythm;
