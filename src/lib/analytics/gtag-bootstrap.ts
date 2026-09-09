import {
  ADS_SUBSCRIPTION_CONVERSION_LOCK,
  PRODUCTION_GA_MEASUREMENT_ID,
  PRODUCTION_GOOGLE_ADS_ID,
  isSafeGoogleAdsSendTo,
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

/**
 * Prefer the Ads id as `gtag/js?id=`. Google Ads' HTML scanner looks for
 * `AW-` in that URL; the same gtag.js still accepts `gtag('config', 'G-…')`.
 */
export function primaryGtagId(ids: string[]): string {
  const unique = [...new Set(ids.filter(isSafeGtagId))];
  return unique.find((id) => id.startsWith("AW-")) ?? unique.find((id) => id.startsWith("G-")) ?? unique[0] ?? "";
}

export function gtagConsentUpdatePayload(
  consent: "granted" | "denied",
): typeof GTAG_CONSENT_GRANTED | typeof GTAG_CONSENT_DENIED {
  return consent === "granted" ? GTAG_CONSENT_GRANTED : GTAG_CONSENT_DENIED;
}

/** Hostnames interpolatable into gtag linker / cookie_domain. */
export function isSafeGtagHostname(host: string): boolean {
  const normalized = host.toLowerCase().replace(/^www\./, "");
  if (!normalized || normalized === "localhost" || normalized === "127.0.0.1") return false;
  if (normalized === "vercel.app" || normalized.endsWith(".vercel.app")) return false;
  return /^[a-z0-9](?:[a-z0-9-]*[a-z0-9])?(?:\.[a-z0-9](?:[a-z0-9-]*[a-z0-9])?)+$/i.test(
    normalized,
  );
}

/**
 * Marketing + app hosts for `linker.domains`. Without this, a click on
 * myautocore.com that continues on app.myautocore.com starts a second GA4
 * session and drops the Google Ads click id.
 */
export function gtagLinkerDomains(marketingOrigin: string, appOrigin: string): string[] {
  const hosts = [marketingOrigin, appOrigin].map((origin) => {
    try {
      return new URL(origin).hostname.toLowerCase().replace(/^www\./, "");
    } catch {
      return "";
    }
  });
  return [...new Set(hosts.filter(isSafeGtagHostname))];
}

/** Shared parent so `_ga` is readable on both `myautocore.com` and `app.`. */
export function gtagSharedCookieDomain(hosts: string[]): string {
  const unique = [...new Set(hosts.filter(isSafeGtagHostname))];
  if (unique.length === 0) return "";
  const sorted = [...unique].sort((a, b) => a.length - b.length);
  const root = sorted[0];
  if (!root) return "";
  if (sorted.every((host) => host === root || host.endsWith(`.${root}`))) return root;
  return "";
}

export function buildGtagConfigCall(
  id: string,
  linkerDomains: string[] = [],
  cookieDomain = "",
): string {
  if (!isSafeGtagId(id)) {
    throw new Error("gtag config id is not interpolatable");
  }
  const safeDomains = [...new Set(linkerDomains.filter(isSafeGtagHostname))];
  const safeCookie = isSafeGtagHostname(cookieDomain) ? cookieDomain : "";

  if (id.startsWith("AW-")) {
    // One page_view per load: GA4's config owns it. Ads still conversion-links.
    return `gtag('config', '${id}', {"send_page_view":false,"conversion_linker":true});`;
  }

  const options: Record<string, unknown> = {};
  if (safeDomains.length > 0) {
    options.linker = { domains: safeDomains, decorate_forms: true };
  }
  if (safeCookie) options.cookie_domain = safeCookie;
  if (Object.keys(options).length === 0) {
    return `gtag('config', '${id}');`;
  }
  return `gtag('config', '${id}', ${JSON.stringify(options)});`;
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
  linkerDomains: string[] = [],
  cookieDomain = "",
): string {
  const unique = [...new Set(ids.filter(isSafeGtagId))];
  if (unique.length === 0) {
    throw new Error("buildGtagBootstrapScript requires at least one safe gtag id");
  }
  if (!/^[a-z0-9_]+$/.test(cookieName)) {
    throw new Error("consent cookie name is not interpolatable");
  }

  const configs = unique
    .map((id) => buildGtagConfigCall(id, linkerDomains, cookieDomain))
    .join("\n");
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
    gtag('set', 'ads_data_redaction', false);
  } else if (denied) {
    gtag('consent', 'default', ${denied});
    gtag('set', 'ads_data_redaction', true);
  } else {
    gtag('consent', 'default', ${pending});
    gtag('set', 'ads_data_redaction', true);
  }
})();
gtag('set', 'url_passthrough', true);
gtag('js', new Date());
${configs}`;
}

/**
 * Google Ads event snippet for the "Подписка" conversion page.
 *
 * The `gtag('event', 'conversion', { 'send_to': … })` call must appear as
 * plain text in the HTML. Ads' scanner greps page source; it does not run
 * the React tree that fires the same event after hydration.
 *
 * The sessionStorage lock is the same key the Paddle `purchase` path uses, so
 * overlay checkout and this page-load snippet count a payment once.
 */
export function buildGoogleAdsSubscriptionEventSnippet(
  sendTo: string,
  lockKey = ADS_SUBSCRIPTION_CONVERSION_LOCK,
): string {
  if (!isSafeGoogleAdsSendTo(sendTo)) {
    throw new Error("Google Ads send_to is not interpolatable");
  }
  if (!/^[a-z0-9_-]+$/i.test(lockKey)) {
    throw new Error("conversion lock key is not interpolatable");
  }

  return `(function(){
  try {
    if (sessionStorage.getItem('${lockKey}') === '1') return;
    sessionStorage.setItem('${lockKey}', '1');
  } catch (e) {}
  gtag('event', 'conversion', {
      'send_to': '${sendTo}'
  });
})();`;
}

/**
 * Noscript pixel from Google's event snippet. Crawlers that never run JS
 * still see the conversion id and label in an image URL.
 */
export function googleAdsConversionPixelSrc(sendTo: string): string {
  if (!isSafeGoogleAdsSendTo(sendTo)) {
    throw new Error("Google Ads send_to is not interpolatable");
  }
  const separator = sendTo.indexOf("/");
  const conversionId = sendTo.slice("AW-".length, separator);
  const label = sendTo.slice(separator + 1);
  return `https://www.googleadservices.com/pagead/conversion/${conversionId}/?label=${label}&guid=ON&script=0`;
}
