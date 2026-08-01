/**
 * Subscription formatting.
 *
 * Dates follow the device locale rather than a hardcoded one; **prices are
 * never formatted here** — those arrive pre-formatted from the store product,
 * already correct for the user's storefront and currency.
 */
import type { Entitlement } from './types';

const DAY_MS = 24 * 60 * 60 * 1000;

export function formatRenewalDate(date: Date | null | undefined): string {
  if (!date) return '—';
  return date.toLocaleDateString(undefined, {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });
}

/** Compact form for dense rows — "5 Mar 2026". */
export function formatShortDate(date: Date | null | undefined): string {
  if (!date) return '—';
  return date.toLocaleDateString(undefined, {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });
}

/**
 * Whole days remaining, rounded up so a subscription ending in six hours reads
 * "1 day left" rather than "0".
 */
export function daysUntil(date: Date | null | undefined, now = Date.now()): number | null {
  if (!date) return null;
  const diff = date.getTime() - now;
  if (diff <= 0) return 0;
  return Math.ceil(diff / DAY_MS);
}

/** "12 days left" / "1 day left" / "Ends today". */
export function formatDaysRemaining(date: Date | null | undefined, now = Date.now()): string | null {
  const days = daysUntil(date, now);
  if (days === null) return null;
  if (days === 0) return 'Ends today';
  return days === 1 ? '1 day left' : `${days} days left`;
}

export function planLabel(entitlement: Entitlement): string {
  switch (entitlement.tier) {
    case 'enterprise':
      return 'Enterprise';
    case 'pro':
      return 'AutoCore Pro';
    case 'free':
      return 'Free';
  }
}

/**
 * The single sentence describing where this subscription stands in time.
 *
 * Used by the status card, the settings row and the profile hub, so those three
 * can never disagree about whether a subscription renews or ends.
 */
export function renewalLine(entitlement: Entitlement, now = Date.now()): string {
  if (!entitlement.isActive) {
    return entitlement.status === 'canceled' ? 'Your subscription has ended' : 'Basic features';
  }

  if (entitlement.isTrial && entitlement.trialEndsAt) {
    const remaining = formatDaysRemaining(entitlement.trialEndsAt, now);
    return `Trial ${remaining ? `· ${remaining} · ` : ''}ends ${formatShortDate(entitlement.trialEndsAt)}`;
  }

  if (entitlement.inGracePeriod) return 'Payment failed — retrying';

  if (!entitlement.renewsAt) return 'Subscription active';

  return entitlement.willAutoRenew
    ? `Renews ${formatShortDate(entitlement.renewsAt)}`
    : `Ends ${formatShortDate(entitlement.renewsAt)}`;
}

/** Terse variant for settings rows and the profile hub subtitle. */
export function subscriptionHint(entitlement: Entitlement, now = Date.now()): string {
  if (!entitlement.isActive) return 'Basic features';
  if (entitlement.isTrial && entitlement.trialEndsAt) {
    return formatDaysRemaining(entitlement.trialEndsAt, now) ?? 'Trial active';
  }
  if (entitlement.inGracePeriod) return 'Payment issue';
  if (entitlement.renewsAt) {
    return entitlement.willAutoRenew
      ? `Renews ${formatShortDate(entitlement.renewsAt)}`
      : `Ends ${formatShortDate(entitlement.renewsAt)}`;
  }
  return 'Subscription active';
}

/** Label for the date row: a renewal and an expiry are not the same fact. */
export function periodEndLabel(entitlement: Entitlement): string {
  if (entitlement.isTrial) return 'Trial ends';
  if (!entitlement.willAutoRenew) return 'Access until';
  return 'Next billing date';
}
