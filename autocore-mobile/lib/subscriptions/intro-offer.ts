/**
 * StoreKit 2 introductory-offer parsing.
 *
 * Pure — no React Native, no `react-native-iap`. The purchase manager feeds it
 * the product payload; tests feed fixtures. Duration always comes from Apple,
 * never a hardcoded "14 days".
 */
import type { IntroOffer } from './types';

export type RawIntroPeriod = {
  unit?: string | null;
  value?: number | null;
};

export type RawSubscriptionOffer = {
  type?: string | null;
  paymentMode?: string | null;
  displayPrice?: string | null;
  localizedPriceIOS?: string | null;
  price?: number | null;
  period?: RawIntroPeriod | null;
  periodCount?: number | null;
  numberOfPeriodsIOS?: number | null;
};

export type RawStoreProduct = {
  subscriptionOffers?: RawSubscriptionOffer[] | null;
  subscriptionInfoIOS?: {
    introductoryOffer?: RawSubscriptionOffer | null;
    subscriptionGroupId?: string | null;
  } | null;
  subscriptionGroupIdIOS?: string | null;
  introductoryPriceIOS?: string | null;
  introductoryPricePaymentModeIOS?: string | null;
  introductoryPriceNumberOfPeriodsIOS?: string | number | null;
  introductoryPriceSubscriptionPeriodIOS?: string | null;
};

const PERIOD_UNITS: ReadonlySet<IntroOffer['periodUnit']> = new Set([
  'day',
  'week',
  'month',
  'year',
]);

export function normalizePeriodUnit(value: string | null | undefined): IntroOffer['periodUnit'] | null {
  const unit = value?.trim().toLowerCase();
  if (!unit) return null;
  return PERIOD_UNITS.has(unit as IntroOffer['periodUnit'])
    ? (unit as IntroOffer['periodUnit'])
    : null;
}

function isIntroductory(type: string | null | undefined): boolean {
  return type?.trim().toLowerCase() === 'introductory';
}

function isFreeTrial(offer: RawSubscriptionOffer): boolean {
  const mode = offer.paymentMode?.trim().toLowerCase() ?? '';
  return (
    mode === 'free-trial' ||
    mode === 'freetrial' ||
    mode === 'free_trial' ||
    offer.price === 0
  );
}

function offerDuration(offer: RawSubscriptionOffer): { count: number; unit: IntroOffer['periodUnit'] } | null {
  const unit = normalizePeriodUnit(offer.period?.unit);
  if (!unit) return null;
  const periodLength = Number(offer.period?.value ?? 1);
  const cycles = Number(offer.periodCount ?? offer.numberOfPeriodsIOS ?? 1);
  const count = Math.max(1, (Number.isFinite(periodLength) ? periodLength : 1) * (Number.isFinite(cycles) ? cycles : 1));
  return canonicalizeDuration(count, unit);
}

/** StoreKit often reports a 2-week intro as 14 days. Prefer weeks. */
export function canonicalizeDuration(
  count: number,
  unit: IntroOffer['periodUnit'],
): { count: number; unit: IntroOffer['periodUnit'] } {
  if (unit === 'day' && count >= 7 && count % 7 === 0) {
    return { count: count / 7, unit: 'week' };
  }
  return { count, unit };
}

function fromOffer(offer: RawSubscriptionOffer): IntroOffer | null {
  const duration = offerDuration(offer);
  if (!duration) return null;
  const displayPrice =
    offer.displayPrice?.trim() ||
    offer.localizedPriceIOS?.trim() ||
    (isFreeTrial(offer) ? 'Free' : '');
  if (!displayPrice) return null;
  return {
    displayPrice,
    periodCount: duration.count,
    periodUnit: duration.unit,
    isFreeTrial: isFreeTrial(offer),
  };
}

/**
 * Prefer StoreKit 2 `subscriptionOffers` / `subscriptionInfoIOS.introductoryOffer`.
 * Fall back to the legacy iOS introductoryPrice* fields.
 */
export function readIntroOfferFromProduct(product: RawStoreProduct): IntroOffer | null {
  const fromList = product.subscriptionOffers?.find((entry) => isIntroductory(entry.type));
  if (fromList) {
    const parsed = fromOffer(fromList);
    if (parsed) return parsed;
  }

  const fromInfo = product.subscriptionInfoIOS?.introductoryOffer;
  if (fromInfo) {
    const parsed = fromOffer({
      ...fromInfo,
      type: fromInfo.type ?? 'introductory',
    });
    if (parsed) return parsed;
  }

  const unit = normalizePeriodUnit(product.introductoryPriceSubscriptionPeriodIOS);
  if (unit && product.introductoryPriceIOS) {
    const periods = Number(product.introductoryPriceNumberOfPeriodsIOS ?? 1);
    const mode = product.introductoryPricePaymentModeIOS?.trim().toLowerCase() ?? '';
    const duration = canonicalizeDuration(
      Number.isFinite(periods) && periods > 0 ? periods : 1,
      unit,
    );
    return {
      displayPrice: product.introductoryPriceIOS,
      periodCount: duration.count,
      periodUnit: duration.unit,
      isFreeTrial: mode === 'free-trial' || mode === 'freetrial' || mode === 'free_trial',
    };
  }

  return null;
}

/** Prefer the group id StoreKit put on the product over our catalog string. */
export function readSubscriptionGroupId(product: RawStoreProduct): string | null {
  const fromInfo = product.subscriptionInfoIOS?.subscriptionGroupId?.trim();
  if (fromInfo) return fromInfo;
  const fromIos = product.subscriptionGroupIdIOS?.trim();
  return fromIos || null;
}
