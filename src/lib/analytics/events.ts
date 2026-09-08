"use client";

import {
  isAnalyticsEnabled,
  isSafeGoogleAdsSendTo,
  resolveGoogleAdsId,
  resolveGoogleAdsSubscriptionSendTo,
} from "./ga-config";

/**
 * The funnel, as events.
 *
 * These exist to answer one question paid traffic cannot answer on its own:
 * *where* the money stops working. Google Ads optimises toward whatever
 * conversion you give it, and with none it optimises toward clicks — which is
 * how a budget is spent buying visitors who never sign up.
 *
 * The names are GA4's own where GA4 has one (`sign_up`, `begin_checkout`,
 * `purchase`), because recommended events get the built-in reports and the
 * Google Ads conversion import for free. The rest are ours.
 *
 * Mark `sign_up`, `trial_started` and `purchase` as key events in GA4 and
 * import them into Google Ads — that is the whole point of the wiring below.
 */
export type AnalyticsEvent =
  /** Account created. The first thing an ad can be held responsible for. */
  | "sign_up"
  /** Workspace created or joined — the real activation step, not signup. */
  | "company_created"
  /** The 14-day trial actually started. */
  | "trial_started"
  /** A Pro gate blocked something. `feature` says which. */
  | "paywall_viewed"
  /** Checkout opened. */
  | "begin_checkout"
  /** Checkout completed. */
  | "purchase";

/**
 * Parameters allowed on an event.
 *
 * Deliberately narrow. Sending personal data to Google Analytics breaks its
 * terms of service and would put customer emails and company names into a
 * third party's system, so nothing here carries an identity: no email, no
 * display name, no company name, no user id. Ids that must travel are opaque.
 */
export type AnalyticsParams = {
  /** Which gate refused, for `paywall_viewed`. */
  feature?: string;
  /** `monthly` | `yearly`. */
  interval?: string;
  /** Where in the product the event fired, e.g. `onboarding`, `settings`. */
  surface?: string;
  /** Purchase value, for `purchase` only. */
  value?: number;
  currency?: string;
  /** Paddle transaction id — opaque, used by Google Ads to dedupe conversions. */
  transaction_id?: string;
};

type GtagWindow = Window & {
  gtag?: (command: "event" | "config" | "js" | "consent" | "set", ...args: unknown[]) => void;
};

const ADS_SUBSCRIPTION_CONVERSION_LOCK = "autocore-aw-subscription-conversion";

function readTrimmed(record: Record<string, unknown>, key: string): string | undefined {
  const value = record[key];
  if (typeof value !== "string") return undefined;
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : undefined;
}

function readTotal(record: Record<string, unknown>): number | undefined {
  const totals = record.totals;
  if (!totals || typeof totals !== "object") return undefined;
  const raw = (totals as { total?: unknown }).total;
  const value = typeof raw === "number" ? raw : typeof raw === "string" ? Number.parseFloat(raw) : Number.NaN;
  return Number.isFinite(value) ? value : undefined;
}

/**
 * Map a Paddle `checkout.completed` payload onto the GA4 `purchase` params.
 *
 * Reads only money and an opaque transaction id. Customer email and company
 * identifiers stay out — those would be personal data in Google's hands.
 */
export function purchaseParamsFromCheckout(data: unknown, interval: string | null): AnalyticsParams {
  const params: AnalyticsParams = {};
  if (interval) params.interval = interval;
  if (!data || typeof data !== "object") return params;

  const record = data as Record<string, unknown>;
  const transactionId = readTrimmed(record, "transaction_id") ?? readTrimmed(record, "transactionId");
  if (transactionId) params.transaction_id = transactionId;

  const currency = readTrimmed(record, "currency_code") ?? readTrimmed(record, "currencyCode");
  if (currency) params.currency = currency;

  const value = readTotal(record);
  if (value !== undefined) params.value = value;

  return params;
}

/**
 * Google Ads `conversion` payload for the "Подписка" action.
 *
 * `send_to` is the Ads event snippet. Value, currency, and transaction id are
 * optional extras: they let Ads optimise on money and drop duplicate fires
 * when overlay checkout and the thank-you page both report the same payment.
 */
export function googleAdsSubscriptionConversionParams(
  params: AnalyticsParams,
  sendTo: string,
): Record<string, unknown> {
  const event: Record<string, unknown> = { send_to: sendTo };
  if (params.value !== undefined) event.value = params.value;
  if (params.currency) event.currency = params.currency;
  if (params.transaction_id) event.transaction_id = params.transaction_id;
  return event;
}

function markSubscriptionConversionSent(): boolean {
  try {
    if (sessionStorage.getItem(ADS_SUBSCRIPTION_CONVERSION_LOCK) === "1") return false;
    sessionStorage.setItem(ADS_SUBSCRIPTION_CONVERSION_LOCK, "1");
  } catch {
    // Private mode can refuse sessionStorage. Prefer one extra hit over silence.
  }
  return true;
}

/** Thank-you routes Google's conversion snippet is meant to run on. */
export function isSubscriptionThankYou(pathname: string, checkout: string | null): boolean {
  const path = pathname.replace(/\/$/, "") || "/";
  return path === "/welcome" || checkout === "success";
}

/**
 * Fire the Google Ads "Подписка" conversion once per tab.
 *
 * Called from Paddle `checkout.completed` (has money + transaction id) and
 * from the thank-you pages (`/welcome`, `?checkout=success`) so a redirect
 * that skipped the overlay event is still counted.
 */
export function trackGoogleAdsSubscriptionConversion(params: AnalyticsParams = {}): void {
  if (!isAnalyticsEnabled()) return;
  if (typeof window === "undefined") return;
  if (!resolveGoogleAdsId(window.location.hostname)) return;

  const sendTo = resolveGoogleAdsSubscriptionSendTo();
  if (!isSafeGoogleAdsSendTo(sendTo)) return;

  const gtag = (window as GtagWindow).gtag;
  if (typeof gtag !== "function") return;
  if (!markSubscriptionConversionSent()) return;

  try {
    gtag("event", "conversion", googleAdsSubscriptionConversionParams(params, sendTo));
  } catch {
    // An analytics call is never worth an interrupted user action.
  }
}

/**
 * Record a funnel event.
 *
 * Never throws and never blocks: analytics failing must not take a signup or a
 * checkout down with it. Missing config, an ad blocker, or gtag not having
 * loaded yet all resolve to silence rather than an error.
 */
export function track(event: AnalyticsEvent, params: AnalyticsParams = {}): void {
  if (!isAnalyticsEnabled()) return;
  if (typeof window === "undefined") return;

  const gtag = (window as GtagWindow).gtag;
  if (typeof gtag !== "function") return;

  try {
    // No `send_to`: exactly one tag is configured per host, and naming an id
    // here would send app-host events to the marketing stream whenever the two
    // domains are on separate streams.
    gtag("event", event, params);
    if (event === "purchase") {
      trackGoogleAdsSubscriptionConversion(params);
    }
  } catch {
    // An analytics call is never worth an interrupted user action.
  }
}
