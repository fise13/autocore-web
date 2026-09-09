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
import {
  buildGtagConfigCall,
  gtagConsentUpdatePayload,
  gtagLinkerDomains,
  gtagSharedCookieDomain,
  primaryGtagId,
} from "@/lib/analytics/gtag-bootstrap";
import { getAppUrl, getMarketingUrl } from "@/lib/site-urls";

type GtagFn = (command: string, ...args: unknown[]) => void;

function applyGtagConsentUpdate(consent: "granted" | "denied"): boolean {
  const gtag = (window as Window & { gtag?: GtagFn }).gtag;
  if (typeof gtag !== "function") return false;
  gtag("consent", "update", gtagConsentUpdatePayload(consent));
  gtag("set", "ads_data_redaction", consent !== "granted");
  return true;
}

type GoogleAnalyticsTagProps = {
  /** True when `GoogleTagHead` already put gtag.js in the document. */
  embedded?: boolean;
};

/**
 * Either loads the Google tag after consent (local / preview) or, when the
 * tag is already in `<head>`, only pushes Consent Mode updates.
 *
 * Production embeds the snippet in HTML so Google Ads can detect
 * `G-QEVTMP0BYB` and `AW-18344172044`. Cookies and ads storage stay denied
 * until this component sees `granted`.
 */
export function GoogleAnalyticsTag({ embedded = false }: GoogleAnalyticsTagProps) {
  const consent = useSyncExternalStore(subscribeConsent, getConsent, getServerConsent);
  const [ids, setIds] = useState<{ ga: string; ads: string } | null>(null);

  useEffect(() => {
    if (embedded) return;
    if (!isAnalyticsEnabled()) return;
    const host = window.location.hostname;
    setIds({
      ga: resolveMeasurementId(host),
      ads: resolveGoogleAdsId(host),
    });
  }, [embedded]);

  useEffect(() => {
    if (!embedded) return;
    if (consent !== "granted" && consent !== "denied") return;

    const apply = (): boolean => applyGtagConsentUpdate(consent);
    if (apply()) return;

    const interval = window.setInterval(() => {
      if (apply()) window.clearInterval(interval);
    }, 50);
    const timeout = window.setTimeout(() => window.clearInterval(interval), 8_000);
    return () => {
      window.clearInterval(interval);
      window.clearTimeout(timeout);
    };
  }, [consent, embedded]);

  if (embedded) return null;
  if (consent !== "granted") return null;
  if (!ids) return null;

  const ga = isSafeGtagId(ids.ga) ? ids.ga : "";
  const ads = isSafeGtagId(ids.ads) ? ids.ads : "";
  const unique = [...new Set([ga, ads].filter(Boolean))];
  const primary = primaryGtagId(unique);
  if (!primary) return null;

  const linkerDomains = gtagLinkerDomains(getMarketingUrl(), getAppUrl());
  const cookieDomain = gtagSharedCookieDomain(linkerDomains);

  return (
    <>
      <Script src={`https://www.googletagmanager.com/gtag/js?id=${primary}`} strategy="afterInteractive" />
      <Script id="autocore-gtag" strategy="afterInteractive">
        {`
window.dataLayer = window.dataLayer || [];
function gtag(){dataLayer.push(arguments);}
gtag('js', new Date());
${unique.map((id) => buildGtagConfigCall(id, linkerDomains, cookieDomain)).join("\n")}
`}
      </Script>
    </>
  );
}
