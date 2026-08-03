/**
 * Unified screen rhythm — thin aliases of tokens (DL v3).
 * Feature layout files must alias this object (no local spacing overrides).
 */
import { tokens } from './tokens';

/** Unified screen rhythm — do not confuse with breakpoints `screen` dimensions */
export const rhythm = {
  pad: tokens.space.screenX,
  section: tokens.space.section,
  stack: tokens.space.stack,
  inline: tokens.space.inline,
  tight: tokens.space[1.5],
  micro: tokens.space.micro,

  hairline: tokens.control.hairline,

  cardRadius: tokens.radius.group,
  radius: tokens.radius.group,
  panelRadius: tokens.radius.sheet,
  heroRadius: tokens.radius.sheet,

  logo: 36,
  logoSm: 32,
  avatar: 80,
  iconBox: 32,
  iconTile: 28,

  /** Prefer typography.title1 / footnote / sectionLabel — kept for existing layout math */
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

  rowMinHeight: tokens.control.heightLg,
  actionTile: 80,
  searchHeight: tokens.control.heightLg,
  chipHeight: 36,
  filterHeight: 34,

  headerTop: tokens.space[2],
  headerBottom: tokens.space[3],

  tabBarBreathing: tokens.space[2],

  cardPadX: tokens.space[3.5],
  cardPadY: tokens.space[3],
} as const;

/**
 * Shared motion — hubs stay quiet. Springs bind to the 5-spring DL table.
 */
export const screenMotion = {
  enabled: false,
  duration: tokens.motion.duration.instant,
  translateY: 0,
  stagger: 0,
  spring: tokens.motion.springs.settle,
  press: tokens.motion.springs.press,
} as const;

export type ScreenTokens = typeof rhythm;
