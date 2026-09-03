"use client";

import Script from "next/script";
import { useEffect, useState, useSyncExternalStore } from "react";

import { getConsent, getServerConsent, subscribeConsent } from "@/lib/analytics/consent";
import {
  isAnalyticsEnabled,
  isSafeGtagId,
  resolveGoogleAdsId,
  resolveMeasurementId,
} from "@/lib/analytics/ga-config";

/**
 * Loads the Google tag for whichever host the page is being served from.
 *
 * The host is read on the client, after mount, on purpose. Marketing and the
 * product are one Next app on two domains, so the id can differ per request —
 * but resolving that server-side means `headers()` in the root layout, which
 * would turn every statically rendered marketing page dynamic. Those pages are
 * the ones competing for search position, so a few milliseconds of delay before
 * the tag loads is the cheaper trade.
 *
 * Rendering nothing on the server and the tag on the client is also what keeps
 * this free of hydration mismatches.
 *
 * Nothing loads before consent is granted. That is what makes the banner a
 * gate rather than a notice: no script, no cookie, no request to Google until
 * someone has said yes.
 *
 * GA4 (`G-…`) and Google Ads (`AW-…`) share one gtag bootstrap. The Ads
 * `config` line is the conversion-linker Google's snippet asks for when the
 * Analytics tag is already on the site.
 */
export function GoogleAnalyticsTag() {
  const consent = useSyncExternalStore(subscribeConsent, getConsent, getServerConsent);
  const [ids, setIds] = useState<{ ga: string; ads: string } | null>(null);

  useEffect(() => {
    if (!isAnalyticsEnabled()) return;
    const host = window.location.hostname;
    setIds({
      ga: resolveMeasurementId(host),
      ads: resolveGoogleAdsId(host),
    });
  }, []);

  if (consent !== "granted") return null;
  if (!ids) return null;

  const ga = isSafeGtagId(ids.ga) ? ids.ga : "";
  const ads = isSafeGtagId(ids.ads) ? ids.ads : "";
  const unique = [...new Set([ga, ads].filter(Boolean))];
  const primary = unique[0];
  if (!primary) return null;

  return (
    <>
      <Script src={`https://www.googletagmanager.com/gtag/js?id=${primary}`} strategy="afterInteractive" />
      <Script id="autocore-gtag" strategy="afterInteractive">
        {`
window.dataLayer = window.dataLayer || [];
function gtag(){dataLayer.push(arguments);}
gtag('js', new Date());
${unique.map((id) => `gtag('config', '${id}');`).join("\n")}
`}
      </Script>
    </>
  );
}
