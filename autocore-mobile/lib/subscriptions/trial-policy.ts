/**
 * Apple introductory-offer policy for the paywall.
 *
 * The only trial AutoCore advertises is StoreKit 2's introductory offer on the
 * AutoCore Pro subscription group. There is no in-app trial product, no local
 * timer, and no second trial when switching monthly ↔ yearly — Apple grants
 * one intro per Apple ID per group.
 */
import type { Entitlement, IntroOffer, StoreProduct } from './types';

export type TrialOffer =
  | { kind: 'apple_intro'; offer: IntroOffer }
  | { kind: 'none' };

export type TrialPolicyInput = {
  entitlement: Entitlement;
  /** The plan the user is about to buy. */
  product: StoreProduct | null;
  /**
   * `Product.SubscriptionInfo.isEligibleForIntroOffer` for the shared
   * AutoCore Pro group. False until StoreKit answers — never flash a trial.
   */
  introEligible: boolean;
};

export function resolveTrialOffer({
  entitlement,
  product,
  introEligible,
}: TrialPolicyInput): TrialOffer {
  if (entitlement.isActive) return { kind: 'none' };
  if (!introEligible || !product?.introOffer) return { kind: 'none' };
  return { kind: 'apple_intro', offer: product.introOffer };
}

export function describePeriodUnit(unit: IntroOffer['periodUnit'], count: number): string {
  if (count === 1) return unit;
  return `${unit}s`;
}

/** Human phrase for an introductory offer, e.g. "2 weeks free". */
export function describeIntroOffer(offer: IntroOffer): string {
  const unit = describePeriodUnit(offer.periodUnit, offer.periodCount);
  return offer.isFreeTrial
    ? `${offer.periodCount} ${unit} free`
    : `${offer.displayPrice} for ${offer.periodCount} ${unit}`;
}

export function describeTrialOffer(trial: TrialOffer): string | null {
  return trial.kind === 'apple_intro' ? describeIntroOffer(trial.offer) : null;
}

export function describeRenewalPeriod(interval: StoreProduct['interval']): string | null {
  if (interval === 'yearly') return 'year';
  if (interval === 'monthly') return 'month';
  return null;
}

export function describeSelectedPrice(product: StoreProduct | null): string | null {
  const period = describeRenewalPeriod(product?.interval ?? null);
  if (!product?.displayPrice || !period) return null;
  return `${product.displayPrice} per ${period}`;
}

/** Eligible → Start Free Trial. Otherwise Subscribe — never a false trial CTA. */
export function describeTrialCta(trial: TrialOffer): string {
  if (trial.kind === 'apple_intro' && trial.offer.isFreeTrial) return 'Start Free Trial';
  return 'Subscribe';
}

/**
 * StoreKit legal line. Mentions a free period only when Apple will actually
 * apply one. Monthly and yearly share a group, so the copy never implies a
 * second trial after switching plans.
 */
export function describePaywallDisclosure(
  trial: TrialOffer,
  product: StoreProduct | null,
): string {
  const selectedPrice = describeSelectedPrice(product) ?? 'the selected plan';

  if (trial.kind === 'apple_intro') {
    return `${describeIntroOffer(trial.offer)}, then ${selectedPrice}. Auto-renews unless cancelled at least 24 hours before the period ends.`;
  }

  return `${selectedPrice}. Auto-renews unless cancelled at least 24 hours before the period ends.`;
}
