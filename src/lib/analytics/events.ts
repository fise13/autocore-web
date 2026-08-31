"use client";

import { isAnalyticsEnabled } from "./ga-config";

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
  gtag?: (command: "event", eventName: string, params?: Record<string, unknown>) => void;
};

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
  } catch {
    // An analytics call is never worth an interrupted user action.
  }
}
