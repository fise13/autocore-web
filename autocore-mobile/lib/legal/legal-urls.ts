/**
 * Public legal pages, as they are actually routed on the marketing site.
 *
 * These are not decorative. App Store guideline 3.1.2 requires a subscription
 * screen to link to a working Terms of Use (EULA) and Privacy Policy, and App
 * Review opens them. This app previously pointed at `/terms` and `/privacy`,
 * which have never existed — the site serves the `/legal/*` tree declared in
 * `src/i18n/routing.ts` — so both links 404'd on the live paywall.
 *
 * `legal-urls.test.ts` pins the `/legal/` prefix so the shorter form cannot
 * creep back in; nothing in the app can tell the difference at build time.
 */

const MARKETING_ORIGIN = 'https://myautocore.com';

export const LEGAL_URLS = {
  terms: `${MARKETING_ORIGIN}/legal/terms`,
  privacy: `${MARKETING_ORIGIN}/legal/privacy`,
  refund: `${MARKETING_ORIGIN}/legal/refund`,
} as const;

export type LegalUrlKey = keyof typeof LEGAL_URLS;
