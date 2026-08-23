import { getHostKind } from "@/lib/site-urls";

/**
 * Google Analytics 4 configuration.
 *
 * Two shapes are supported, and they are not equivalent:
 *
 * **One stream over both domains (recommended).** Set only
 * `NEXT_PUBLIC_GA_MEASUREMENT_ID` and list `myautocore.com` and
 * `app.myautocore.com` under that stream's *Configure your domains*. A visitor
 * who lands on an ad page and signs up on the app host stays one session, and
 * the ad that paid for them gets the conversion.
 *
 * **A stream per domain.** Additionally set `NEXT_PUBLIC_GA_MEASUREMENT_ID_APP`
 * for the app host. GA4 cross-domain linking only stitches traffic carrying the
 * *same* measurement id, so with two ids the crossing from marketing to signup
 * starts a new session attributed to a `myautocore.com` referral. Each domain
 * measures correctly on its own; what breaks is the join between them, which is
 * exactly the number a paid campaign is judged on.
 *
 * The second shape is supported because reporting per surface is a legitimate
 * thing to want. It is just the wrong default when the goal is Google Ads.
 */

/** Default id — used for every host unless a more specific one is configured. */
export const GA_MEASUREMENT_ID = process.env.NEXT_PUBLIC_GA_MEASUREMENT_ID?.trim() ?? "";

/** Optional separate stream for `app.myautocore.com`. */
export const GA_MEASUREMENT_ID_APP =
  process.env.NEXT_PUBLIC_GA_MEASUREMENT_ID_APP?.trim() ?? "";

export function isAnalyticsEnabled(): boolean {
  return GA_MEASUREMENT_ID.length > 0 || GA_MEASUREMENT_ID_APP.length > 0;
}

export type MeasurementIds = {
  /** Applies to every host unless a more specific id matches. */
  default: string;
  /** Optional separate stream for the app host. */
  app: string;
};

/**
 * Choose a measurement id for a hostname.
 *
 * Takes the ids as an argument rather than reading the module constants so the
 * decision can be tested without reloading the module to change `process.env`.
 */
export function pickMeasurementId(hostname: string, ids: MeasurementIds): string {
  if (ids.app && getHostKind(hostname) === "app") {
    return ids.app;
  }
  // Falls back to the app id when it is the only one set, so a half-finished
  // configuration still measures something instead of silently nothing.
  return ids.default || ids.app;
}

/**
 * Which measurement id this hostname should report to.
 *
 * Resolved from the hostname on the client rather than from request headers on
 * the server: reading headers in the root layout would opt every marketing page
 * out of static rendering, and those pages are the ones fighting for search
 * position.
 */
export function resolveMeasurementId(hostname: string): string {
  return pickMeasurementId(hostname, {
    default: GA_MEASUREMENT_ID,
    app: GA_MEASUREMENT_ID_APP,
  });
}
