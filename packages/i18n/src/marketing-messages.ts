/**
 * Typed accessors and documentation for the `marketing` i18n namespace.
 *
 * Source of truth: `messages/en/marketing.json` (English is authoritative for key
 * names). `messages/ru/marketing.json` mirrors the exact same key tree — verified by
 * a flatten/structural-diff check whenever the catalogs change (see the namespace
 * sections below for what each key covers).
 *
 * This namespace covers every marketing-site surface previously hardcoded in:
 * - `src/components/marketing/experience/content/landing-content.ts` → `landing`
 * - `src/components/marketing/product/content/product-content.ts` → `product`
 * - `src/components/marketing/content/marketing-site-content.ts` → `pages.*`
 * - `src/components/marketing/content/legal-content.ts` → `pages.privacy`, `pages.terms`
 * - `src/components/marketing/site/site-navigation.ts` → `nav`, `footer.columns`
 * - `src/components/marketing/site/site-nav.tsx` / `site-footer.tsx` → `nav`, `footer`, `a11y.nav`
 * - `src/lib/seo/marketing-seo.ts` → `seo.*`
 * - `src/components/not-found/not-found-page.tsx` → `notFound`
 *
 * Usage with next-intl:
 *
 * ```ts
 * const t = useTranslations("marketing");
 * t("landing.hero.title");
 * t.raw("landing.chaos.items"); // array of { time, text }
 * ```
 *
 * Do NOT translate brand/product terms that must stay identical across locales:
 * AutoCore, Overview, Operating Loop, VIN, PDF, API, CRM, Excel, WhatsApp,
 * Apple ID, Windows, iPhone, Desktop, Mobile, engine codes (EJ253, G4KC), Kaspi.
 */

import type en from "./messages/en/marketing.json";

/** Shape of the `marketing` namespace, derived from the English (source) catalog. */
export type MarketingMessages = typeof en;

/** Top-level sections available under the `marketing` namespace. */
export type MarketingSection = keyof MarketingMessages;

/** Page keys under `marketing.pages` (marketing sub-pages with dedicated copy). */
export type MarketingPageSection = keyof MarketingMessages["pages"];

/** Page keys under `marketing.seo.pages` / `marketing.seo.breadcrumbs` / `marketing.seo.keywords`. */
export type MarketingSeoPageKey = keyof MarketingMessages["seo"]["pages"];
