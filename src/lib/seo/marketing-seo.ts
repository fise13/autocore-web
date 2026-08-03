import type { AppLocale } from "@autocore/i18n/config";
import { DEFAULT_LOCALE } from "@autocore/i18n/config";
import enMarketingMessages from "@autocore/i18n/messages/en/marketing.json";
import ruMarketingMessages from "@autocore/i18n/messages/ru/marketing.json";

import type { MarketingPathKey } from "@/lib/seo/marketing-paths";
import { marketingAbsoluteUrl } from "@/lib/seo/marketing-paths";
import { getAppUrl, getMarketingUrl } from "@/lib/site-urls";
import { getPlatformContacts } from "@/lib/platform/platform-contacts";

/** Synchronous per-locale marketing messages (JSON-LD builders run outside async request config). */
const MARKETING_MESSAGES_BY_LOCALE: Record<AppLocale, typeof enMarketingMessages> = {
  en: enMarketingMessages,
  ru: ruMarketingMessages,
};

export function getMarketingMessages(locale: AppLocale) {
  return MARKETING_MESSAGES_BY_LOCALE[locale] ?? MARKETING_MESSAGES_BY_LOCALE[DEFAULT_LOCALE];
}

const platformContacts = getPlatformContacts();

const enBrand = enMarketingMessages.seo.brand;

export const MARKETING_BRAND = {
  name: "AutoCore",
  legalName: enBrand.legalName,
  tagline: enBrand.tagline,
  shortDescription: enBrand.shortDescription,
  supportEmail: platformContacts.email,
  supportPhone: platformContacts.phone,
  locale: "en_US",
  language: "en",
  themeColor: "#0a0a0a",
  /** Primary market for Yandex region + schema areaServed */
  regionCountries: ["KZ", "RU", "US"] as const,
} as const;

function brandForLocale(locale: AppLocale) {
  const seoBrand = getMarketingMessages(locale).seo.brand;
  return {
    name: MARKETING_BRAND.name,
    legalName: seoBrand.legalName,
    tagline: seoBrand.tagline,
    shortDescription: seoBrand.shortDescription,
    supportEmail: MARKETING_BRAND.supportEmail,
    supportPhone: MARKETING_BRAND.supportPhone,
    language: locale,
  };
}

const KNOWS_ABOUT = [
  "auto parts inventory software",
  "automotive inventory software",
  "salvage yard software",
  "auto recycler software",
  "used auto parts inventory",
  "used engine inventory software",
  "warehouse inventory software",
  "VIN barcode SKU tracking",
  // Russian keywords removed with the English-only switch. They were emitted on
  // every page regardless of locale; the `ru` structured-data branch below is
  // untouched and still carries Russian for whenever `ru` is re-enabled.
] as const;

const marketingUrl = getMarketingUrl().replace(/\/$/, "");
const appUrl = getAppUrl().replace(/\/$/, "");
const supportUrl = `${marketingUrl}/contact`;
const defaultOgImage = `${marketingUrl}/opengraph-image`;
const logoUrl = `${marketingUrl}/icon`;

/** Human-readable titles for breadcrumb JSON-LD, per locale. */
function breadcrumbTitle(key: MarketingPathKey, locale: AppLocale): string {
  const messages = getMarketingMessages(locale);
  return messages.seo.breadcrumbs[key];
}

/** Fallback commercial keywords (EN). Live metadata uses i18n `seo.keywords.*`. */
export const MARKETING_KEYWORDS = enMarketingMessages.seo.keywords.general;

export type MarketingSeoPageConfig = {
  key: MarketingPathKey;
  title: string;
  description: string;
  keywords?: string[];
  ogTitle?: string;
};

/** Fallback page SEO (EN). Prefer `buildMarketingMetadata` / i18n messages at runtime. */
export const MARKETING_SEO_PAGES: Record<MarketingPathKey, MarketingSeoPageConfig> = (
  Object.keys(enMarketingMessages.seo.pages) as MarketingPathKey[]
).reduce(
  (acc, key) => {
    const page = enMarketingMessages.seo.pages[key];
    const pageKeywords =
      (enMarketingMessages.seo.keywords as Record<string, string[] | undefined>)[key] ?? [];
    acc[key] = {
      key,
      title: page.title,
      description: page.description,
      ogTitle: page.ogTitle,
      keywords: [...enMarketingMessages.seo.keywords.general, ...pageKeywords],
    };
    return acc;
  },
  {} as Record<MarketingPathKey, MarketingSeoPageConfig>,
);

export function getMarketingSeoPage(key: MarketingPathKey): MarketingSeoPageConfig {
  return MARKETING_SEO_PAGES[key];
}

/** BreadcrumbList JSON-LD: Home → current page, localized. */
export function buildBreadcrumbJsonLd(key: MarketingPathKey, locale: AppLocale = DEFAULT_LOCALE) {
  const items =
    key === "home"
      ? ([{ key: "home" as MarketingPathKey }] as const)
      : ([{ key: "home" as MarketingPathKey }, { key }] as const);

  return {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    "@id": `${marketingAbsoluteUrl(key, locale)}#breadcrumb`,
    itemListElement: items.map((item, index) => ({
      "@type": "ListItem",
      position: index + 1,
      name: breadcrumbTitle(item.key, locale),
      item: marketingAbsoluteUrl(item.key, locale),
    })),
  };
}

export function buildFaqJsonLd(items: ReadonlyArray<{ readonly q: string; readonly a: string }>) {
  return {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: items.map((item) => ({
      "@type": "Question",
      name: item.q,
      acceptedAnswer: {
        "@type": "Answer",
        text: item.a,
      },
    })),
  };
}

/** Alias: FAQ JSON-LD built directly from next-intl message items (`t.raw(...)`). */
export const buildFaqJsonLdFromMessages = buildFaqJsonLd;

const SOFTWARE_COPY = {
  en: {
    trialName: "14-day free trial",
    trialDescription: "Full access for 14 days, no card required",
    proName: "Pro subscription",
    proDescription: "Full AutoCore for one company",
    audience: "Salvage yards, auto recyclers, repair shops, used auto parts sellers",
    features: [
      "Auto parts warehouse inventory",
      "Work orders for repair shops",
      "Used engine inventory and catalog",
      "Accounting and ledger entries",
      "Overview for owners",
      "RBAC and activity audit log",
      "Windows desktop and mobile apps",
      "VIN, barcode, and SKU tracking",
    ],
    contactName: "Contact AutoCore",
    contactDescription: "Demo, sales, support, and partnerships for AutoCore inventory software.",
    offerDescription:
      "Full AutoCore access for one company with a 14-day free trial.",
  },
  ru: {
    trialName: "Пробный период 14 дней",
    trialDescription: "Полный доступ на 14 дней без карты",
    proName: "Подписка Pro",
    proDescription: "Полный AutoCore для одной компании",
    audience: "Авторазборки, авторециклеры, автосервисы, магазины б/у запчастей",
    features: [
      "Складской учёт автозапчастей",
      "Заказ-наряды для автосервиса",
      "Учёт двигателей и каталог моторов",
      "Бухгалтерия и проводки",
      "Overview для владельца",
      "RBAC и журнал активности",
      "Desktop Windows и мобильные приложения",
      "VIN, штрихкод и SKU",
    ],
    contactName: "Контакты AutoCore",
    contactDescription: "Демо, продажи, поддержка и партнёрства AutoCore.",
    offerDescription:
      "Полный доступ к AutoCore для одной компании с 14-дневным пробным периодом.",
  },
} as const;

export function buildMarketingJsonLd(locale: AppLocale = DEFAULT_LOCALE) {
  const brand = brandForLocale(locale);
  const copy = SOFTWARE_COPY[locale] ?? SOFTWARE_COPY.en;
  const downloadUrl = marketingAbsoluteUrl("download", locale);
  const pricingUrl = marketingAbsoluteUrl("pricing", locale);

  return [
    {
      "@context": "https://schema.org",
      "@type": "Organization",
      "@id": `${marketingUrl}#organization`,
      name: brand.name,
      legalName: brand.legalName,
      url: marketingUrl,
      logo: {
        "@type": "ImageObject",
        url: logoUrl,
      },
      image: defaultOgImage,
      description: brand.shortDescription,
      email: brand.supportEmail,
      telephone: brand.supportPhone,
      contactPoint: [
        {
          "@type": "ContactPoint",
          contactType: "customer support",
          email: brand.supportEmail,
          telephone: brand.supportPhone,
          url: supportUrl,
          availableLanguage: ["ru", "en", "kk"],
          areaServed: MARKETING_BRAND.regionCountries.map((code) => ({
            "@type": "Country",
            name: code,
          })),
        },
        {
          "@type": "ContactPoint",
          contactType: "sales",
          email: brand.supportEmail,
          url: supportUrl,
          availableLanguage: ["ru", "en"],
        },
      ],
      areaServed: MARKETING_BRAND.regionCountries.map((code) => ({
        "@type": "Country",
        name: code,
      })),
      knowsAbout: [...KNOWS_ABOUT],
      sameAs: [],
    },
    {
      "@context": "https://schema.org",
      "@type": "WebSite",
      "@id": `${marketingUrl}#website`,
      name: brand.name,
      url: marketingUrl,
      description: brand.shortDescription,
      inLanguage: brand.language,
      publisher: { "@id": `${marketingUrl}#organization` },
      copyrightHolder: { "@id": `${marketingUrl}#organization` },
    },
    {
      "@context": "https://schema.org",
      "@type": "SoftwareApplication",
      "@id": `${marketingUrl}#software`,
      name: brand.name,
      applicationCategory: "BusinessApplication",
      applicationSubCategory: "Auto parts inventory and salvage yard software",
      operatingSystem: "Web, Windows, iOS, Android",
      description: brand.shortDescription,
      inLanguage: brand.language,
      image: defaultOgImage,
      screenshot: defaultOgImage,
      url: marketingUrl,
      downloadUrl,
      installUrl: appUrl,
      softwareVersion: "1",
      author: { "@id": `${marketingUrl}#organization` },
      publisher: { "@id": `${marketingUrl}#organization` },
      offers: {
        "@type": "AggregateOffer",
        lowPrice: "0",
        highPrice: "39",
        priceCurrency: "USD",
        offerCount: 2,
        offers: [
          {
            "@type": "Offer",
            name: copy.trialName,
            price: "0",
            priceCurrency: "USD",
            url: `${appUrl}/demo`,
            availability: "https://schema.org/InStock",
            description: copy.trialDescription,
          },
          {
            "@type": "Offer",
            name: copy.proName,
            price: "39",
            priceCurrency: "USD",
            url: pricingUrl,
            availability: "https://schema.org/InStock",
            priceSpecification: {
              "@type": "UnitPriceSpecification",
              price: "39",
              priceCurrency: "USD",
              billingDuration: "P1M",
              referenceQuantity: {
                "@type": "QuantitativeValue",
                value: 1,
                unitText: "company",
              },
            },
            description: copy.proDescription,
          },
        ],
      },
      audience: {
        "@type": "BusinessAudience",
        audienceType: copy.audience,
      },
      featureList: [...copy.features],
      countriesSupported: MARKETING_BRAND.regionCountries.join(", "),
    },
  ];
}

export function buildCollectionPageJsonLd(
  key: MarketingPathKey,
  name: string,
  description: string,
  items?: ReadonlyArray<string>,
  locale: AppLocale = DEFAULT_LOCALE,
) {
  const url = marketingAbsoluteUrl(key, locale);

  return {
    "@context": "https://schema.org",
    "@type": "CollectionPage",
    "@id": `${url}#collection`,
    url,
    name,
    description,
    inLanguage: locale,
    isPartOf: { "@id": `${marketingUrl}#website` },
    about: { "@id": `${marketingUrl}#software` },
    ...(items?.length
      ? {
          mainEntity: {
            "@type": "ItemList",
            itemListElement: items.map((item, index) => ({
              "@type": "ListItem",
              position: index + 1,
              name: item,
            })),
          },
        }
      : {}),
  };
}

export function buildContactPageJsonLd(locale: AppLocale = DEFAULT_LOCALE) {
  const url = marketingAbsoluteUrl("contact", locale);
  const copy = SOFTWARE_COPY[locale] ?? SOFTWARE_COPY.en;
  const brand = brandForLocale(locale);

  return {
    "@context": "https://schema.org",
    "@type": "ContactPage",
    "@id": `${url}#contact-page`,
    url,
    name: copy.contactName,
    description: copy.contactDescription,
    inLanguage: locale,
    isPartOf: { "@id": `${marketingUrl}#website` },
    about: { "@id": `${marketingUrl}#organization` },
    mainEntity: {
      "@type": "Organization",
      "@id": `${marketingUrl}#organization`,
      name: brand.name,
      email: brand.supportEmail,
      telephone: brand.supportPhone,
      url: supportUrl,
    },
  };
}

export function buildPricingOfferJsonLd(locale: AppLocale = DEFAULT_LOCALE) {
  const url = marketingAbsoluteUrl("pricing", locale);
  const copy = SOFTWARE_COPY[locale] ?? SOFTWARE_COPY.en;

  return {
    "@context": "https://schema.org",
    "@type": "Offer",
    "@id": `${url}#offer`,
    url,
    name: "AutoCore Pro",
    category: "SaaS subscription",
    price: "39",
    priceCurrency: "USD",
    priceSpecification: {
      "@type": "UnitPriceSpecification",
      price: "39",
      priceCurrency: "USD",
      billingDuration: "P1M",
      referenceQuantity: {
        "@type": "QuantitativeValue",
        value: 1,
        unitText: "company",
      },
    },
    eligibleDuration: {
      "@type": "QuantitativeValue",
      value: 14,
      unitCode: "DAY",
    },
    itemOffered: {
      "@type": "SoftwareApplication",
      "@id": `${marketingUrl}#software`,
      name: MARKETING_BRAND.name,
    },
    seller: { "@id": `${marketingUrl}#organization` },
    availability: "https://schema.org/InStock",
    description: copy.offerDescription,
  };
}
