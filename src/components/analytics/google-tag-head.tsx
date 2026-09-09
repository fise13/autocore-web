import {
  CONSENT_COOKIE_NAME,
  buildGtagBootstrapScript,
  embeddedGoogleTagIds,
  gtagLinkerDomains,
  gtagLoaderSrc,
  gtagSharedCookieDomain,
  primaryGtagId,
} from "@/lib/analytics/gtag-bootstrap";
import { getAppUrl, getMarketingUrl, DEFAULT_APP_ORIGIN, DEFAULT_MARKETING_ORIGIN } from "@/lib/site-urls";

/**
 * Google's gtag snippet as real `<script>` tags in the document `<head>`.
 *
 * `next/script` queues work through `self.__next_s`, so Google Ads' HTML
 * scanner never sees `gtag/js?id=AW-…` or `gtag('config', 'AW-…')` as a
 * script — only a JSON string Next.js later interprets. Native tags match
 * the snippet Ads emails. Consent Mode v2 still starts storage denied.
 *
 * GA4 config also lists both product hosts so a click on the marketing
 * domain that continues on `app.` stays one session.
 */
export function GoogleTagHead() {
  const ids = embeddedGoogleTagIds();
  const primary = primaryGtagId(ids);
  if (!primary) return null;

  const linkerDomains = (() => {
    const fromEnv = gtagLinkerDomains(getMarketingUrl(), getAppUrl());
    if (fromEnv.length > 0) return fromEnv;
    // Vercel production must still stitch the two live hosts if env URLs
    // resolved to localhost / preview (gtagLinkerDomains drops those).
    if (process.env.VERCEL_ENV === "production") {
      return gtagLinkerDomains(DEFAULT_MARKETING_ORIGIN, DEFAULT_APP_ORIGIN);
    }
    return fromEnv;
  })();

  return (
    <>
      <script async src={gtagLoaderSrc(primary)} />
      <script
        id="autocore-gtag"
        dangerouslySetInnerHTML={{
          __html: buildGtagBootstrapScript(
            ids,
            CONSENT_COOKIE_NAME,
            linkerDomains,
            gtagSharedCookieDomain(linkerDomains),
          ),
        }}
      />
    </>
  );
}
