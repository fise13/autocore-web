/**
 * Status presentation — the single mapping from subscription state to its
 * colour, glyph and label.
 *
 * This previously existed twice (the manage screen and the paywall banner each
 * had their own table), which is exactly how "Past due" ends up amber in one
 * place and red in another. One table, one answer.
 */
import {
  AlertTriangleIcon,
  CheckCircle2Icon,
  ClockIcon,
  CloudIcon,
  SparklesIcon,
  XIcon,
} from '@/assets/icons';
import type { IconProps } from '@/assets/icons';
import type { ToneName } from '@/theme';

import type { Entitlement } from './types';

export type StatusPresentation = {
  label: string;
  tone: ToneName;
  icon: React.ComponentType<IconProps>;
  /** One-line explanation shown under the plan name. */
  detail: string;
};

/**
 * Derived from the whole entitlement rather than `status` alone: "active" means
 * something different during a trial, inside a billing-retry grace period, or
 * after the user has turned off auto-renew.
 */
export function presentEntitlement(entitlement: Entitlement, renewalLine: string): StatusPresentation {
  if (!entitlement.isActive) {
    if (entitlement.status === 'canceled') {
      return { label: 'Expired', tone: 'muted', icon: XIcon, detail: renewalLine };
    }
    return { label: 'Free', tone: 'muted', icon: SparklesIcon, detail: 'Basic features' };
  }

  if (entitlement.inGracePeriod) {
    return {
      label: 'Payment issue',
      tone: 'warning',
      icon: AlertTriangleIcon,
      detail: 'Update your payment method to keep Pro',
    };
  }

  if (entitlement.isTrial) {
    return { label: 'Trial', tone: 'primary', icon: ClockIcon, detail: renewalLine };
  }

  if (!entitlement.willAutoRenew) {
    return { label: 'Ending', tone: 'warning', icon: ClockIcon, detail: renewalLine };
  }

  if (entitlement.tier === 'enterprise') {
    return { label: 'Enterprise', tone: 'primary', icon: CloudIcon, detail: renewalLine };
  }

  return { label: 'Active', tone: 'success', icon: CheckCircle2Icon, detail: renewalLine };
}

/** Badge variant names predate the tone scale; this is the one bridge. */
export const TONE_BADGE_VARIANT: Record<
  ToneName,
  'default' | 'success' | 'warning' | 'destructive' | 'secondary'
> = {
  primary: 'default',
  success: 'success',
  warning: 'warning',
  danger: 'destructive',
  muted: 'secondary',
  default: 'secondary',
};
