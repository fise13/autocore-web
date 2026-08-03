/**
 * Work Orders — geometry + domain ink only.
 * Colour and type come from the shared theme (same surface language as Overview).
 */
import { StyleSheet, type TextStyle, type ViewStyle } from 'react-native';

import { spacing } from '@/theme/spacing';
import { tokens } from '@/theme/tokens';
import type { WorkOrderStatus } from '@/types/work-order';

export const wo = {
  pad: tokens.space.screenX,
  rowGap: tokens.space.inline + 2,
  stackGap: tokens.space.stack + 2,
  sectionGap: tokens.space.section,
  rule: StyleSheet.hairlineWidth,
  /** Match Overview / DL group radius — no private soft-Airbnb ladder. */
  radius: tokens.radius.sheet,
  radiusSm: tokens.radius.group,
  radiusPill: tokens.radius.full,
  touch: tokens.control.hitTarget,
  searchHeight: tokens.control.heightLg,
  chipHeight: 36,
  quickAction: 32,
  cardPadX: tokens.space.stack + 2,
  cardPadY: tokens.space.stack,
  rowPadY: 14,
  rowMinHeight: 88,
  /** Compact hero — quiet secondary fill, not a status colour plane. */
  heroHeight: 132,
  rowSeparatorInset: spacing[4],
  swipeActionWidth: 80,
} as const;

/**
 * @deprecated Prefer `<Text variant="…" />` — kept for gradual migration off
 * uppercase stamps / private type ladders (DESIGN.md).
 */
export const woType = {
  screenTitle: {
    fontSize: 32,
    fontWeight: '700',
    letterSpacing: -0.9,
    lineHeight: 38,
  } as const,
  overline: {
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 1.1,
    lineHeight: 14,
    textTransform: 'uppercase',
  } as const,
  woNumber: {
    fontSize: 11,
    fontWeight: '600',
    letterSpacing: 0.5,
    lineHeight: 15,
    fontVariant: ['tabular-nums'],
  } as TextStyle,
  statusPill: {
    fontSize: 10.5,
    fontWeight: '700',
    letterSpacing: 0.7,
    lineHeight: 13,
    textTransform: 'uppercase',
  } as const,
  clientName: {
    fontSize: 17,
    fontWeight: '700',
    letterSpacing: -0.4,
    lineHeight: 22,
  } as const,
  vehicleLine: {
    fontSize: 13,
    fontWeight: '500',
    letterSpacing: -0.1,
    lineHeight: 18,
  } as const,
  meta: {
    fontSize: 12,
    fontWeight: '500',
    letterSpacing: 0,
    lineHeight: 16,
  } as const,
  price: {
    fontSize: 17,
    fontWeight: '700',
    fontVariant: ['tabular-nums'],
    letterSpacing: -0.4,
    lineHeight: 22,
  } as TextStyle,
  statValue: {
    fontSize: 22,
    fontWeight: '700',
    fontVariant: ['tabular-nums'],
    letterSpacing: -0.6,
    lineHeight: 26,
  } as TextStyle,
  section: {
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: 0.9,
    lineHeight: 16,
    textTransform: 'uppercase',
  } as const,
  groupHeader: {
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: 0.9,
    lineHeight: 16,
    textTransform: 'uppercase',
  } as const,
  heroClient: {
    fontSize: 30,
    fontWeight: '700',
    letterSpacing: -0.9,
    lineHeight: 35,
  } as const,
};

export const WO_DOMAIN_STAGES: WorkOrderStatus[] = [
  'draft',
  'confirmed',
  'in_progress',
  'waiting_parts',
  'completed',
  'delivered',
];

/** Quiet card surface — fill or hairline, never both + shadow (DL v3). */
export function woFlatCard(
  colors: { card: string; border: string },
  options?: { borderColor?: string; isDark?: boolean },
): ViewStyle {
  return {
    backgroundColor: colors.card,
    borderRadius: wo.radius,
    borderWidth: options?.isDark || options?.borderColor ? wo.rule : 0,
    borderColor: options?.borderColor ?? colors.border,
  };
}

/** Listing island — same surface language as Overview cards. */
export function woActivityCard(
  colors: { card: string; border: string; primary: string; secondary: string },
  options?: { borderColor?: string; isDark?: boolean; selected?: boolean },
): ViewStyle {
  const selected = options?.selected === true;
  return {
    backgroundColor: selected ? colors.secondary : colors.card,
    borderRadius: wo.radius,
    paddingHorizontal: wo.cardPadX,
    paddingVertical: wo.rowPadY,
    minHeight: wo.rowMinHeight,
    borderWidth: options?.isDark || selected || options?.borderColor ? wo.rule : 0,
    borderColor: selected ? colors.primary : (options?.borderColor ?? colors.border),
  };
}

export function woRuledSection(colors: { card: string; border: string }): ViewStyle {
  return {
    backgroundColor: colors.card,
    borderRadius: wo.radius,
    borderWidth: wo.rule,
    borderColor: colors.border,
    paddingHorizontal: wo.cardPadX,
    paddingVertical: wo.cardPadY,
  };
}
