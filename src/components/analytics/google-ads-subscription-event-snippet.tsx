import { isSafeGoogleAdsSendTo, resolveGoogleAdsSubscriptionSendTo } from "@/lib/analytics/ga-config";
import {
  buildGoogleAdsSubscriptionEventSnippet,
  googleAdsConversionPixelSrc,
  shouldEmbedGoogleTagInDocument,
} from "@/lib/analytics/gtag-bootstrap";

/**
 * Google Ads event snippet for the "Подписка" conversion page (`/welcome`).
 *
 * Must be server-rendered into HTML: Ads verifies the tag by fetching the
 * conversion URL and looking for `gtag('event', 'conversion', { 'send_to' })`.
 * The client component that fires the same event after hydration is invisible
 * to that scan, and waiting for cookie consent made the crawler a no-op.
 */
export function GoogleAdsSubscriptionEventSnippet() {
  if (!shouldEmbedGoogleTagInDocument()) return null;

  const sendTo = resolveGoogleAdsSubscriptionSendTo();
  if (!isSafeGoogleAdsSendTo(sendTo)) return null;

  return (
    <>
      <script
        id="autocore-aw-subscription-conversion"
        dangerouslySetInnerHTML={{ __html: buildGoogleAdsSubscriptionEventSnippet(sendTo) }}
      />
      <noscript>
        <div style={{ display: "inline" }}>
          {/* Google's 1×1 conversion pixel; next/image cannot run inside noscript. */}
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            height={1}
            width={1}
            style={{ borderStyle: "none" }}
            alt=""
            src={googleAdsConversionPixelSrc(sendTo)}
          />
        </div>
      </noscript>
    </>
  );
}
