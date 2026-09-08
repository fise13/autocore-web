import {
  PRODUCTION_GA_MEASUREMENT_ID,
  PRODUCTION_GOOGLE_ADS_ID,
  isSafeGtagId,
} from "./ga-config";

/**
 * Name of the cookie `consent.ts` writes. Duplicated here so the server-rendered
 * Google tag can read the same answer without importing a client module.
 */
export const CONSENT_COOKIE_NAME = "autocore_cookie_consent";

export const GTAG_CONSENT_DENIED = {
  ad_storage: "denied",
  ad_user_data: "denied",
  ad_personalization: "denied",
  analytics_storage: "denied",
} as const;

export const GTAG_CONSENT_GRANTED = {
  ad_storage: "granted",
  ad_user_data: "granted",
  ad_personalization: "granted",
  analytics_storage: "granted",
} as const;

/**
 * Put the Google tag in the document `<head>` so Google Ads / Tag Assistant
 * can see `gtag.js` and both `config` lines without clicking Accept.
 *
 * Vercel production always embeds: that is the live site the ads account
 * is judged on. Localhost and preview stay silent unless an id is set
 * explicitly, so development traffic cannot land in that property.
 */
export function shouldEmbedGoogleTagInDocument(
  vercelEnv = process.env.VERCEL_ENV,
  configuredGa = process.env.NEXT_PUBLIC_GA_MEASUREMENT_ID?.trim() ?? "",
  configuredAds = process.env.NEXT_PUBLIC_GOOGLE_ADS_ID?.trim() ?? "",
): boolean {
  if (vercelEnv === "production") return true;
  return configuredGa.length > 0 || configuredAds.length > 0;
}

export function documentGoogleTagIds(
  vercelEnv = process.env.VERCEL_ENV,
  configuredGa = process.env.NEXT_PUBLIC_GA_MEASUREMENT_ID?.trim() ?? "",
  configuredAds = process.env.NEXT_PUBLIC_GOOGLE_ADS_ID?.trim() ?? "",
): { ga: string; ads: string } {
  const production = vercelEnv === "production";
  const gaRaw = configuredGa || (production ? PRODUCTION_GA_MEASUREMENT_ID : "");
  const adsRaw = configuredAds || (production ? PRODUCTION_GOOGLE_ADS_ID : "");
  return {
    ga: isSafeGtagId(gaRaw) ? gaRaw : "",
    ads: isSafeGtagId(adsRaw) ? adsRaw : "",
  };
}

export function embeddedGoogleTagIds(
  vercelEnv = process.env.VERCEL_ENV,
  configuredGa = process.env.NEXT_PUBLIC_GA_MEASUREMENT_ID?.trim() ?? "",
  configuredAds = process.env.NEXT_PUBLIC_GOOGLE_ADS_ID?.trim() ?? "",
): string[] {
  if (!shouldEmbedGoogleTagInDocument(vercelEnv, configuredGa, configuredAds)) {
    return [];
  }
  const { ga, ads } = documentGoogleTagIds(vercelEnv, configuredGa, configuredAds);
  return [...new Set([ga, ads].filter(Boolean))];
}

export function gtagLoaderSrc(id: string): string {
  if (!isSafeGtagId(id)) {
    throw new Error("gtag loader id is not interpolatable");
  }
  return `https://www.googletagmanager.com/gtag/js?id=${id}`;
}

/** Prefer the GA4 id as `gtag/js?id=`, matching Google's own snippet. */
export function primaryGtagId(ids: string[]): string {
  const unique = [...new Set(ids.filter(isSafeGtagId))];
  return unique.find((id) => id.startsWith("G-")) ?? unique[0] ?? "";
}

export function gtagConsentUpdatePayload(
  consent: "granted" | "denied",
): typeof GTAG_CONSENT_GRANTED | typeof GTAG_CONSENT_DENIED {
  return consent === "granted" ? GTAG_CONSENT_GRANTED : GTAG_CONSENT_DENIED;
}

/**
 * Inline bootstrap Google's snippet asks for, plus Consent Mode v2.
 *
 * Storage starts denied unless the visitor already answered the banner, so
 * Tag Assistant sees the tag while GDPR still gates cookies. `wait_for_update`
 * gives the client a beat to call `consent update` before the first hit.
 */
export function buildGtagBootstrapScript(
  ids: string[],
  cookieName = CONSENT_COOKIE_NAME,
): string {
  const unique = [...new Set(ids.filter(isSafeGtagId))];
  if (unique.length === 0) {
    throw new Error("buildGtagBootstrapScript requires at least one safe gtag id");
  }
  if (!/^[a-z0-9_]+$/.test(cookieName)) {
    throw new Error("consent cookie name is not interpolatable");
  }

  const configs = unique.map((id) => `gtag('config', '${id}');`).join("\n");
  const granted = JSON.stringify(GTAG_CONSENT_GRANTED);
  const denied = JSON.stringify(GTAG_CONSENT_DENIED);
  const pending = JSON.stringify({ ...GTAG_CONSENT_DENIED, wait_for_update: 500 });

  return `window.dataLayer = window.dataLayer || [];
function gtag(){dataLayer.push(arguments);}
(function(){
  var parts = document.cookie.split(';');
  var granted = false;
  var denied = false;
  for (var i = 0; i < parts.length; i++) {
    var p = parts[i].trim();
    if (p === '${cookieName}=granted') granted = true;
    if (p === '${cookieName}=denied') denied = true;
  }
  if (granted) {
    gtag('consent', 'default', ${granted});
  } else if (denied) {
    gtag('consent', 'default', ${denied});
  } else {
    gtag('consent', 'default', ${pending});
  }
})();
gtag('set', 'url_passthrough', true);
gtag('set', 'ads_data_redaction', true);
gtag('js', new Date());
${configs}`;
}
