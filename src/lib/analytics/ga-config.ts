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
 *
 * Production hosts load `PRODUCTION_GA_MEASUREMENT_ID` even when the env var is
 * unset, so a Google Ads conversion tag cannot silently go missing after a
 * deploy. Localhost and Vercel previews stay silent unless an id is set
 * explicitly — those sessions must not land in the property the ads account
 * is judged on.
 */

/**
 * Google tag for the live property (Google Ads conversion import).
 * Public by design: it appears in page source on every measured page.
 */
export const PRODUCTION_GA_MEASUREMENT_ID = "G-QEVTMP0BYB";

/**
 * Google Ads conversion linker. Loaded next to GA4 via `gtag('config', …)`
 * so the "Подписка" conversion can fire without a second script tag.
 */
export const PRODUCTION_GOOGLE_ADS_ID = "AW-18344172044";

/** Event snippet send_to for the Ads conversion named "Подписка". */
export const PRODUCTION_GOOGLE_ADS_SUBSCRIPTION_SEND_TO =
  "AW-18344172044/FsM2CKqomuscEIy0l6tE";

/** Env override. Empty means "use the production tag on live hosts only". */
const CONFIGURED_GA_MEASUREMENT_ID = process.env.NEXT_PUBLIC_GA_MEASUREMENT_ID?.trim() ?? "";

/** Optional separate stream for `app.myautocore.com`. */
export const GA_MEASUREMENT_ID_APP =
  process.env.NEXT_PUBLIC_GA_MEASUREMENT_ID_APP?.trim() ?? "";

const CONFIGURED_GOOGLE_ADS_ID = process.env.NEXT_PUBLIC_GOOGLE_ADS_ID?.trim() ?? "";

const CONFIGURED_GOOGLE_ADS_SUBSCRIPTION_SEND_TO =
  process.env.NEXT_PUBLIC_GOOGLE_ADS_SUBSCRIPTION_SEND_TO?.trim() ?? "";

/** Effective default id: env override, otherwise the production Google tag. */
export const GA_MEASUREMENT_ID = CONFIGURED_GA_MEASUREMENT_ID || PRODUCTION_GA_MEASUREMENT_ID;

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
 * Live product hosts may use the baked-in production tag. Localhost and
 * `*.vercel.app` previews may not — those would otherwise write development
 * traffic into the same property Google Ads reads conversions from.
 */
export function allowsProductionGoogleTag(hostname: string): boolean {
  if (getHostKind(hostname) === "local") return false;
  const normalized = hostname.toLowerCase().split(":")[0] ?? "";
  if (normalized === "vercel.app" || normalized.endsWith(".vercel.app")) return false;
  return true;
}

/**
 * Resolve a measurement id from explicit configuration plus the production
 * fallback, without reading `process.env`. Same reason as `pickMeasurementId`.
 */
export function resolveMeasurementIdFrom(
  hostname: string,
  ids: MeasurementIds,
  productionFallback: string,
): string {
  const configured = pickMeasurementId(hostname, ids);
  if (configured) return configured;
  if (productionFallback && allowsProductionGoogleTag(hostname)) {
    return productionFallback;
  }
  return "";
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
  return resolveMeasurementIdFrom(
    hostname,
    { default: CONFIGURED_GA_MEASUREMENT_ID, app: GA_MEASUREMENT_ID_APP },
    PRODUCTION_GA_MEASUREMENT_ID,
  );
}

/**
 * Google Ads account id for this hostname.
 *
 * Same production-host gate as GA4: live domains get the baked-in AW id,
 * localhost and Vercel previews stay silent unless an id is set explicitly.
 */
export function resolveGoogleAdsIdFrom(
  hostname: string,
  configured: string,
  productionFallback: string,
): string {
  if (configured) return configured;
  if (productionFallback && allowsProductionGoogleTag(hostname)) {
    return productionFallback;
  }
  return "";
}

export function resolveGoogleAdsId(hostname: string): string {
  return resolveGoogleAdsIdFrom(hostname, CONFIGURED_GOOGLE_ADS_ID, PRODUCTION_GOOGLE_ADS_ID);
}

export function resolveGoogleAdsSubscriptionSendTo(): string {
  return CONFIGURED_GOOGLE_ADS_SUBSCRIPTION_SEND_TO || PRODUCTION_GOOGLE_ADS_SUBSCRIPTION_SEND_TO;
}

/** IDs interpolated into the gtag bootstrap must be this shape — nothing else. */
export function isSafeGtagId(id: string): boolean {
  return /^(G-[A-Z0-9]+|AW-\d+)$/.test(id);
}

export function isSafeGoogleAdsSendTo(value: string): boolean {
  return /^AW-\d+\/[A-Za-z0-9_-]+$/.test(value);
}

export function isAnalyticsEnabled(): boolean {
  if (typeof window !== "undefined") {
    return resolveMeasurementId(window.location.hostname).length > 0;
  }
  return (
    CONFIGURED_GA_MEASUREMENT_ID.length > 0 ||
    GA_MEASUREMENT_ID_APP.length > 0 ||
    PRODUCTION_GA_MEASUREMENT_ID.length > 0
  );
}
