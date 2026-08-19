import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import {
  describePaywallDisclosure,
  describeTrialCta,
  resolveTrialOffer,
  type TrialPolicyInput,
} from './trial-policy';
import type { Entitlement, StoreProduct } from './types';

const FREE: Entitlement = {
  companyId: 'co_1',
  tier: 'free',
  planId: 'free',
  status: 'active',
  isActive: false,
  isTrial: false,
  trialEndsAt: null,
  trialUsed: false,
  renewsAt: null,
  willAutoRenew: false,
  inGracePeriod: false,
  provider: 'internal',
  managedExternally: false,
  source: 'unknown',
};

const YEARLY: StoreProduct = {
  planId: 'pro_yearly',
  sku: 'com.autocore.pro.yearly',
  displayPrice: '$239.90',
  priceAmount: 239.9,
  currency: 'USD',
  title: 'AutoCore Pro',
  description: '',
  interval: 'yearly',
  introOffer: {
    displayPrice: 'Free',
    periodCount: 2,
    periodUnit: 'week',
    isFreeTrial: true,
  },
};

function input(partial: Partial<TrialPolicyInput> = {}): TrialPolicyInput {
  return {
    entitlement: FREE,
    product: YEARLY,
    introEligible: true,
    ...partial,
  };
}

describe('resolveTrialOffer', () => {
  it('surfaces Apple intro when the Apple ID is eligible', () => {
    const trial = resolveTrialOffer(input());
    assert.equal(trial.kind, 'apple_intro');
    if (trial.kind !== 'apple_intro') return;
    assert.equal(trial.offer.periodCount, 2);
    assert.equal(trial.offer.periodUnit, 'week');
  });

  it('does not advertise a trial when the Apple ID already used the group intro', () => {
    const trial = resolveTrialOffer(input({ introEligible: false }));
    assert.equal(trial.kind, 'none');
  });

  it('does not advertise a trial before StoreKit answers', () => {
    const trial = resolveTrialOffer(input({ introEligible: false, product: YEARLY }));
    assert.equal(trial.kind, 'none');
  });
});

describe('paywall copy', () => {
  it('labels the CTA Start Free Trial only when Apple will apply a free intro', () => {
    assert.equal(describeTrialCta(resolveTrialOffer(input())), 'Start Free Trial');
    assert.equal(describeTrialCta(resolveTrialOffer(input({ introEligible: false }))), 'Subscribe');
  });

  it('states the Apple trial then the selected plan price', () => {
    const line = describePaywallDisclosure(resolveTrialOffer(input()), YEARLY);
    assert.match(line, /2 weeks free/);
    assert.match(line, /\$239\.90 per year/);
    assert.doesNotMatch(line, /14 days/);
  });

  it('does not invent a free period when the user is ineligible', () => {
    const line = describePaywallDisclosure(
      resolveTrialOffer(input({ introEligible: false })),
      YEARLY,
    );
    assert.doesNotMatch(line, /free|trial|14 days/i);
    assert.match(line, /\$239\.90 per year/);
  });

  it('treats monthly and yearly as one group intro, not two trials', () => {
    const monthly: StoreProduct = {
      ...YEARLY,
      planId: 'pro_monthly',
      sku: 'com.autocore.pro.monthly',
      displayPrice: '$24.99',
      interval: 'monthly',
    };
    assert.equal(resolveTrialOffer(input({ product: monthly })).kind, 'apple_intro');
    assert.equal(
      resolveTrialOffer(input({ product: monthly, introEligible: false })).kind,
      'none',
    );
  });
});
