/**
 * Google Analytics 4 configuration.
 *
 * The measurement id is the only switch: with it unset, `<GoogleAnalytics />`
 * is not rendered and every `track()` call is a no-op. That keeps local
 * development and preview deploys out of the production property without
 * anyone remembering to guard a call site.
 *
 * **Cross-domain matters here.** Marketing lives on `myautocore.com` and the
 * product on `app.myautocore.com`, but both are served by this one Next app, so
 * a single tag in the root layout covers both hosts. What the tag cannot do
 * from code is tell GA4 the two domains are one journey — that is a property
 * setting (Admin → Data Streams → Configure tag settings → Configure your
 * domains). Without it, a visitor crossing from an ad landing page to signup
 * starts a *new* session attributed to a referral, and the ad that paid for
 * them gets no credit.
 */

export const GA_MEASUREMENT_ID = process.env.NEXT_PUBLIC_GA_MEASUREMENT_ID?.trim() ?? "";

export function isAnalyticsEnabled(): boolean {
  return GA_MEASUREMENT_ID.length > 0;
}
