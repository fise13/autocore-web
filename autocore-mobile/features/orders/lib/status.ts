import type { SemanticColors } from '@/theme/colors';

import type { OrderStatus } from '../types';

export const orderStatusLabel: Record<OrderStatus, string> = {
  draft: 'Draft',
  confirmed: 'Confirmed',
  in_progress: 'In progress',
  waiting_parts: 'Waiting parts',
  completed: 'Completed',
  delivered: 'Delivered',
  cancelled: 'Cancelled',
};

/**
 * Solid means somebody has to act on this order; subtle means it is parked.
 * That is the whole rule, and it is what makes a long list scannable: the
 * filled pills are the shift's work queue, the tinted ones are context.
 */
export type StatusEmphasis = 'solid' | 'subtle';

const statusEmphasis: Record<OrderStatus, StatusEmphasis> = {
  draft: 'subtle',
  confirmed: 'subtle',
  in_progress: 'solid',
  waiting_parts: 'solid',
  completed: 'solid',
  delivered: 'subtle',
  cancelled: 'subtle',
};

export type StatusInk = {
  label: string;
  emphasis: StatusEmphasis;
  /** Dot, rail, and emphasised numerals. */
  solid: string;
  /** Content sitting on `solid`. */
  onSolid: string;
  /** Tinted pill surface. */
  subtle: string;
  /** Content sitting on `subtle`. */
  onSubtle: string;
  /** Hairline that reads against the card surface. */
  border: string;
  /** Card edge tint for rows that are blocked or void — `undefined` otherwise. */
  cardBorder?: string;
};

/**
 * One place where a status becomes colour. The four tone families that carry a
 * full `x / xSubtle / xOnSubtle / xBorder` contract in the design tokens are the
 * only ones used, so contrast is already guaranteed by `npm run tokens:check`.
 */
export function resolveStatusInk(colors: SemanticColors, status: OrderStatus): StatusInk {
  const label = orderStatusLabel[status];
  const emphasis = statusEmphasis[status];

  switch (status) {
    case 'confirmed':
    case 'in_progress':
      return {
        label,
        emphasis,
        solid: colors.primary,
        onSolid: colors.primaryForeground,
        subtle: colors.primarySubtle,
        onSubtle: colors.primaryOnSubtle,
        border: colors.primaryBorder,
      };
    case 'waiting_parts':
      return {
        label,
        emphasis,
        solid: colors.warning,
        onSolid: colors.warningForeground,
        subtle: colors.warningSubtle,
        onSubtle: colors.warningOnSubtle,
        border: colors.warningBorder,
        cardBorder: colors.warningBorder,
      };
    case 'completed':
    case 'delivered':
      return {
        label,
        emphasis,
        solid: colors.success,
        onSolid: colors.successForeground,
        subtle: colors.successSubtle,
        onSubtle: colors.successOnSubtle,
        border: colors.successBorder,
      };
    case 'cancelled':
      return {
        label,
        emphasis,
        solid: colors.danger,
        onSolid: colors.dangerForeground,
        subtle: colors.dangerSubtle,
        onSubtle: colors.dangerOnSubtle,
        border: colors.dangerBorder,
        cardBorder: colors.dangerBorder,
      };
    case 'draft':
    default:
      return {
        label,
        emphasis,
        solid: colors.mutedForeground,
        onSolid: colors.background,
        subtle: colors.secondary,
        onSubtle: colors.mutedForeground,
        border: colors.border,
      };
  }
}
