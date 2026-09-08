import Script from "next/script";

import {
  buildGtagBootstrapScript,
  embeddedGoogleTagIds,
  gtagLoaderSrc,
  primaryGtagId,
} from "@/lib/analytics/gtag-bootstrap";

/**
 * Google's gtag snippet in the document `<head>`.
 *
 * The Ads conversion email asks for this on every HTML page. Loading it only
 * after cookie consent meant Tag Assistant never saw `G-QEVTMP0BYB` /
 * `AW-18344172044` — the crawler does not click Accept. Consent Mode v2 keeps
 * storage denied until the banner is answered.
 *
 * `beforeInteractive` is required: `afterInteractive` is injected too late
 * for Google's page-source check, and a second copy in the body would double
 * the tag.
 */
export function GoogleTagHead() {
  const ids = embeddedGoogleTagIds();
  const primary = primaryGtagId(ids);
  if (!primary) return null;

  return (
    <>
      <Script src={gtagLoaderSrc(primary)} strategy="beforeInteractive" />
      <Script id="autocore-gtag" strategy="beforeInteractive">
        {buildGtagBootstrapScript(ids)}
      </Script>
    </>
  );
}
