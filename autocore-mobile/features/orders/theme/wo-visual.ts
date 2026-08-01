/**
 * Work Orders — editorial visual language.
 *
 * Type carries the hierarchy, geometry is soft, and colour appears once per row
 * (the status ink). Every screen under `features/orders` reads these tokens, so
 * a change here moves the whole feature together.
 */
import { Platform, StyleSheet, type TextStyle, type ViewStyle } from 'react-native';

import { spacing } from '@/theme/spacing';
import type { WorkOrderStatus } from '@/types/work-order';

export const wo = {
  pad: spacing[4],
  rowGap: spacing[2.5],
  stackGap: spacing[3.5],
  sectionGap: spacing[6],
  /** Hairline rules — thinner than 1px on retina, the way iOS draws them. */
  rule: StyleSheet.hairlineWidth,
  radius: 18,
  radiusSm: 12,
  radiusPill: 999,
  touch: 44,
  searchHeight: 44,
  chipHeight: 36,
  /** Circular quick action on a card footer. */
  quickAction: 32,
  cardPadX: spacing[4],
  cardPadY: spacing[3.5],
} as const;

export const woType = {
  /** Screen title — the editorial anchor of the list. */
  screenTitle: {
    fontSize: 32,
    fontWeight: '700',
    letterSpacing: -0.9,
    lineHeight: 38,
  } satisfies TextStyle,
  /** Small-caps line above a title or section. */
  overline: {
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 1.1,
    lineHeight: 14,
    textTransform: 'uppercase',
  } satisfies TextStyle,
  woNumber: {
    fontSize: 11,
    fontWeight: '600',
    letterSpacing: 0.5,
    lineHeight: 15,
    fontVariant: ['tabular-nums'],
  } satisfies TextStyle,
  statusPill: {
    fontSize: 10.5,
    fontWeight: '700',
    letterSpacing: 0.7,
    lineHeight: 13,
    textTransform: 'uppercase',
  } satisfies TextStyle,
  clientName: {
    fontSize: 17,
    fontWeight: '700',
    letterSpacing: -0.4,
    lineHeight: 22,
  } satisfies TextStyle,
  vehicleLine: {
    fontSize: 13,
    fontWeight: '500',
    letterSpacing: -0.1,
    lineHeight: 18,
  } satisfies TextStyle,
  meta: {
    fontSize: 12,
    fontWeight: '500',
    letterSpacing: 0,
    lineHeight: 16,
  } satisfies TextStyle,
  price: {
    fontSize: 17,
    fontWeight: '700',
    fontVariant: ['tabular-nums'],
    letterSpacing: -0.4,
    lineHeight: 22,
  } satisfies TextStyle,
  /** Big tabular number for the pulse row. */
  statValue: {
    fontSize: 22,
    fontWeight: '700',
    fontVariant: ['tabular-nums'],
    letterSpacing: -0.6,
    lineHeight: 26,
  } satisfies TextStyle,
  section: {
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: 0.9,
    lineHeight: 16,
    textTransform: 'uppercase',
  } satisfies TextStyle,
  /** Sticky day divider in the list. */
  groupHeader: {
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: 0.9,
    lineHeight: 16,
    textTransform: 'uppercase',
  } satisfies TextStyle,
  heroClient: {
    fontSize: 30,
    fontWeight: '700',
    letterSpacing: -0.9,
    lineHeight: 35,
  } satisfies TextStyle,
} as const;

/** Domain workflow path behind the segmented progress track. */
export const WO_DOMAIN_STAGES: WorkOrderStatus[] = [
  'draft',
  'confirmed',
  'in_progress',
  'waiting_parts',
  'completed',
  'delivered',
];

/**
 * Soft depth for raised surfaces. Dark mode leans on the border instead —
 * a shadow under a near-black card is invisible and only costs a raster pass.
 */
function woShadow(isDark: boolean): ViewStyle {
  if (isDark) return {};
  return (
    Platform.select<ViewStyle>({
      ios: {
        shadowColor: '#11131a',
        shadowOffset: { width: 0, height: 6 },
        shadowOpacity: 0.06,
        shadowRadius: 16,
      },
      android: { elevation: 2 },
      default: {},
    }) ?? {}
  );
}

/**
 * The card surface for list rows and detail blocks.
 *
 * `borderColor` overrides the hairline so attention statuses (waiting on parts,
 * cancelled) can tint their own edge without a second wrapper.
 */
export function woFlatCard(
  colors: { card: string; border: string },
  options?: { borderColor?: string; isDark?: boolean },
): ViewStyle {
  return {
    backgroundColor: colors.card,
    borderRadius: wo.radius,
    borderWidth: wo.rule,
    borderColor: options?.borderColor ?? colors.border,
    ...woShadow(options?.isDark ?? false),
  };
}

/** Rounded content block used by the detail screen. */
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
