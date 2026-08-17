/**
 * Trial policy — L3.
 *
 * Two independent trial mechanisms exist and the user must never be shown
 * both:
 *  - Apple's introductory offer, granted per Apple ID per subscription group.
 *  - AutoCore's internal 14-day trial, granted per company (`trialUsed`).
 *
 * One function decides which (if either) is on offer.
 */
import type { Entitlement, IntroOffer, StoreProduct } from './types';

export type TrialOffer =
  | { kind: 'apple_intro'; offer: IntroOffer }
  | { kind: 'internal'; days: number }
  | { kind: 'none' };

export const INTERNAL_TRIAL_DAYS = 14;

export type TrialPolicyInput = {
  entitlement: Entitlement;
  /** The plan the user is about to buy. */
  product: StoreProduct | null;
  /** Apple says this Apple ID may still use the introductory offer. */
  introEligible: boolean;
  /** The company has already consumed its internal trial. */
  internalTrialUsed: boolean;
};

export function resolveTrialOffer({
  entitlement,
  product,
  introEligible,
  internalTrialUsed,
}: TrialPolicyInput): TrialOffer {
  // Already paying — a trial offer would be nonsense.
  if (entitlement.isActive) return { kind: 'none' };

  // Apple's offer wins when available: it is the one the store will actually
  // apply at purchase time, so advertising anything else would misstate terms.
  if (introEligible && product?.introOffer) {
    return { kind: 'apple_intro', offer: product.introOffer };
  }

  if (!internalTrialUsed) {
    return { kind: 'internal', days: INTERNAL_TRIAL_DAYS };
  }

  return { kind: 'none' };
}

/** Human phrase for an introductory offer, e.g. "7 days free". */
export function describeIntroOffer(offer: IntroOffer): string {
  const unit =
    offer.periodCount === 1
      ? offer.periodUnit
      : `${offer.periodUnit}s`;

  return offer.isFreeTrial
    ? `${offer.periodCount} ${unit} free`
    : `${offer.displayPrice} for ${offer.periodCount} ${unit}`;
}

export function describeTrialOffer(trial: TrialOffer): string | null {
  switch (trial.kind) {
    case 'apple_intro':
      return describeIntroOffer(trial.offer);
    case 'internal':
      return `${trial.days} days free`;
    case 'none':
      return null;
  }
}

/** CTA label when a trial is on offer, e.g. "Start 7-day free trial". */
export function describeTrialCta(trial: TrialOffer): string | null {
  if (trial.kind === 'apple_intro' && trial.offer.isFreeTrial) {
    return `Try ${trial.offer.periodCount} days free`;
  }
  if (trial.kind === 'internal') {
    return `Start ${trial.days}-day free trial`;
  }
  return null;
}
