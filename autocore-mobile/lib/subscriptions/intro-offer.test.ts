import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { readIntroOfferFromProduct, readSubscriptionGroupId } from './intro-offer';

describe('readIntroOfferFromProduct', () => {
  it('reads a StoreKit 2 two-week free introductory offer from subscriptionOffers', () => {
    const offer = readIntroOfferFromProduct({
      subscriptionOffers: [
        {
          type: 'introductory',
          paymentMode: 'free-trial',
          displayPrice: 'Free',
          price: 0,
          period: { unit: 'week', value: 2 },
          periodCount: 1,
        },
      ],
    });
    assert.ok(offer);
    assert.equal(offer?.isFreeTrial, true);
    assert.equal(offer?.periodCount, 2);
    assert.equal(offer?.periodUnit, 'week');
  });

  it('multiplies period.value by periodCount (2 × 1 week)', () => {
    const offer = readIntroOfferFromProduct({
      subscriptionOffers: [
        {
          type: 'introductory',
          paymentMode: 'free-trial',
          displayPrice: 'Free',
          period: { unit: 'WEEK', value: 1 },
          periodCount: 2,
        },
      ],
    });
    assert.equal(offer?.periodCount, 2);
    assert.equal(offer?.periodUnit, 'week');
  });

  it('falls back to subscriptionInfoIOS.introductoryOffer', () => {
    const offer = readIntroOfferFromProduct({
      subscriptionInfoIOS: {
        introductoryOffer: {
          type: 'introductory',
          paymentMode: 'free-trial',
          displayPrice: 'Free',
          period: { unit: 'week', value: 2 },
          periodCount: 1,
        },
      },
    });
    assert.equal(offer?.periodCount, 2);
    assert.equal(offer?.periodUnit, 'week');
  });

  it('falls back to the legacy introductoryPriceIOS fields', () => {
    const offer = readIntroOfferFromProduct({
      introductoryPriceIOS: 'Free',
      introductoryPricePaymentModeIOS: 'FREE_TRIAL',
      introductoryPriceNumberOfPeriodsIOS: '2',
      introductoryPriceSubscriptionPeriodIOS: 'WEEK',
    });
    assert.equal(offer?.periodCount, 2);
    assert.equal(offer?.periodUnit, 'week');
    assert.equal(offer?.isFreeTrial, true);
  });

  it('canonicalizes a 14-day StoreKit intro as 2 weeks', () => {
    const offer = readIntroOfferFromProduct({
      subscriptionOffers: [
        {
          type: 'introductory',
          paymentMode: 'free-trial',
          displayPrice: 'Free',
          period: { unit: 'day', value: 14 },
          periodCount: 1,
        },
      ],
    });
    assert.equal(offer?.periodCount, 2);
    assert.equal(offer?.periodUnit, 'week');
  });

  it('ignores promotional offers', () => {
    const offer = readIntroOfferFromProduct({
      subscriptionOffers: [
        {
          type: 'promotional',
          paymentMode: 'free-trial',
          displayPrice: 'Free',
          period: { unit: 'week', value: 2 },
        },
      ],
    });
    assert.equal(offer, null);
  });
});

describe('readSubscriptionGroupId', () => {
  it('prefers subscriptionInfoIOS.subscriptionGroupId', () => {
    assert.equal(
      readSubscriptionGroupId({
        subscriptionInfoIOS: { subscriptionGroupId: '21482040' },
        subscriptionGroupIdIOS: 'fallback',
      }),
      '21482040',
    );
  });
});
