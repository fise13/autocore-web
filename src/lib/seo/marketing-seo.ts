import type { MarketingPathKey } from "@/lib/seo/marketing-paths";
import { marketingAbsoluteUrl } from "@/lib/seo/marketing-paths";
import { getAppUrl, getMarketingUrl } from "@/lib/site-urls";
import { getPlatformContacts } from "@/lib/platform/platform-contacts";

const platformContacts = getPlatformContacts();

export const MARKETING_BRAND = {
  name: "AutoCore",
  legalName: "AutoCore",
  tagline: "Операционная система для авторазборок и автосервисов",
  shortDescription:
    "AutoCore: операционная система для авторазборок и автосервисов. Склад, цех, заказ-наряды, документы и бухгалтерия в одном контуре.",
  supportEmail: platformContacts.email,
  supportPhone: platformContacts.phone,
  locale: "ru_RU",
  language: "ru",
  themeColor: "#0a0a0a",
  /** Primary market for Yandex region + schema areaServed */
  regionCountries: ["KZ", "RU"] as const,
} as const;

const marketingUrl = getMarketingUrl().replace(/\/$/, "");
const appUrl = getAppUrl().replace(/\/$/, "");
const supportUrl = `${marketingUrl}/contact`;
const defaultOgImage = `${marketingUrl}/opengraph-image`;
const logoUrl = `${marketingUrl}/icon`;

/** Human-readable titles for breadcrumb JSON-LD. */
const MARKETING_BREADCRUMB_TITLES: Record<MarketingPathKey, string> = {
  home: "Главная",
  product: "Продукт",
  modules: "Модули",
  pricing: "Тарифы",
  security: "Безопасность",
  contact: "Контакты",
  download: "Скачать",
  downloadMobile: "Мобильное приложение",
  privacy: "Конфиденциальность",
  terms: "Условия использования",
};

/**
 * Core commercial keywords for Yandex + Google (RU).
 * Long-tails first: intent queries owners actually type.
 */
export const MARKETING_KEYWORDS = [
  "программа для авторазборки",
  "программа для автосервиса",
  "программа учёта авторазборка",
  "система управления автосервисом",
  "учёт запчастей авторазборка",
  "складской учёт автосервис",
  "заказ-наряды СТО",
  "учёт двигателей разборка",
  "программа для магазина автозапчастей",
  "бухгалтерия автосервиса",
  "CRM для авторазборки",
  "ПО для разборки авто",
  "система для автосервиса",
  "учёт моторов разборка",
  "облачная программа автосервис",
  "AutoCore",
] as const;

export type MarketingSeoPageConfig = {
  key: MarketingPathKey;
  title: string;
  description: string;
  keywords?: string[];
  ogTitle?: string;
};

/**
 * Titles ~55-70 Cyrillic chars, keyword near the start.
 * Descriptions ~140-160 chars, no em-dashes, concrete benefit + CTA cue.
 */
export const MARKETING_SEO_PAGES: Record<MarketingPathKey, MarketingSeoPageConfig> = {
  home: {
    key: "home",
    title: "Программа для авторазборки и автосервиса | AutoCore",
    description:
      "Склад запчастей, заказ-наряды, учёт двигателей и документы в одной системе. Desktop и телефон синхронизируются. 14 дней бесплатно, без карты.",
    keywords: [
      "операционная система автосервис",
      "демо программа авторазборка",
      "замена Excel автосервис",
    ],
    ogTitle: "AutoCore: программа для авторазборок и автосервисов",
  },
  product: {
    key: "product",
    title: "Как работает AutoCore в авторазборке и автосервисе",
    description:
      "Рабочий день в AutoCore: Mission Control утром, склад и наряды днём, документы и синхронизация устройств без Excel и ночных сверок.",
    keywords: [
      "рабочий процесс авторазборка",
      "Mission Control автосервис",
      "обзор программы авторазборка",
    ],
    ogTitle: "AutoCore: рабочий день в одной системе",
  },
  modules: {
    key: "modules",
    title: "Модули: склад, наряды, моторы, бухгалтерия | AutoCore",
    description:
      "Каталог модулей для авторазборки и СТО: склад запчастей, заказ-наряды, учёт двигателей, бухгалтерия, команда и Mission Control.",
    keywords: ["модуль склад автосервис", "учёт моторов программа", "модули СТО"],
  },
  pricing: {
    key: "pricing",
    title: "Цена AutoCore: $15 в месяц за компанию",
    description:
      "Одна подписка $15/мес за компанию. Полный доступ без скрытых лимитов. 14 дней бесплатно, карта не нужна. Для авторазборок и автосервисов.",
    keywords: ["цена программа автосервис", "тариф авторазборка", "стоимость ПО СТО"],
  },
  contact: {
    key: "contact",
    title: "Контакты AutoCore: демо и поддержка",
    description:
      "Запросите демо или напишите в поддержку AutoCore. Ответим в рабочий день. Помогаем авторазборкам и автосервисам с внедрением.",
    keywords: ["демо программа автосервис", "поддержка авторазборка", "связаться AutoCore"],
  },
  download: {
    key: "download",
    title: "Скачать AutoCore: Windows, web и телефон",
    description:
      "Установите AutoCore на Windows или откройте в браузере и на телефоне. Один аккаунт, склад и наряды синхронизируются в реальном времени.",
    keywords: [
      "скачать AutoCore",
      "desktop авторазборка",
      "веб программа для автосервиса",
    ],
  },
  downloadMobile: {
    key: "downloadMobile",
    title: "Скачать AutoCore на iPhone и Android",
    description:
      "Мобильное приложение AutoCore для склада и цеха. Сканирование, наряды и остатки с тем же аккаунтом, что на desktop и в web.",
    keywords: ["скачать AutoCore iOS", "AutoCore Android", "приложение автосервис"],
  },
  privacy: {
    key: "privacy",
    title: "Политика конфиденциальности AutoCore",
    description:
      "Как AutoCore обрабатывает персональные и операционные данные авторазборок и автосервисов: хранение, права, безопасность и контакты.",
    keywords: ["политика конфиденциальности", "обработка данных автосервис"],
  },
  terms: {
    key: "terms",
    title: "Условия использования AutoCore",
    description:
      "Условия использования облачной программы AutoCore: аккаунт, подписка, данные клиента, ответственность и прекращение доступа.",
    keywords: ["условия использования", "лицензия AutoCore"],
  },
  security: {
    key: "security",
    title: "Безопасность AutoCore: роли, аудит, изоляция",
    description:
      "Роли по модулям, журнал действий, изоляция данных компаний и проверки на сервере. Безопасность для операционного автобизнеса.",
    keywords: ["безопасность SaaS автосервис", "RBAC склад", "аудит программа СТО"],
  },
};

export function getMarketingSeoPage(key: MarketingPathKey): MarketingSeoPageConfig {
  return MARKETING_SEO_PAGES[key];
}

/** BreadcrumbList JSON-LD: Главная → текущая страница. */
export function buildBreadcrumbJsonLd(key: MarketingPathKey) {
  const items =
    key === "home"
      ? ([{ key: "home" as MarketingPathKey }] as const)
      : ([{ key: "home" as MarketingPathKey }, { key }] as const);

  return {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    "@id": `${marketingAbsoluteUrl(key)}#breadcrumb`,
    itemListElement: items.map((item, index) => ({
      "@type": "ListItem",
      position: index + 1,
      name: MARKETING_BREADCRUMB_TITLES[item.key],
      item: marketingAbsoluteUrl(item.key),
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

export function buildMarketingJsonLd() {
  return [
    {
      "@context": "https://schema.org",
      "@type": "Organization",
      "@id": `${marketingUrl}#organization`,
      name: MARKETING_BRAND.name,
      legalName: MARKETING_BRAND.legalName,
      url: marketingUrl,
      logo: {
        "@type": "ImageObject",
        url: logoUrl,
      },
      image: defaultOgImage,
      description: MARKETING_BRAND.shortDescription,
      email: MARKETING_BRAND.supportEmail,
      telephone: MARKETING_BRAND.supportPhone,
      contactPoint: [
        {
          "@type": "ContactPoint",
          contactType: "customer support",
          email: MARKETING_BRAND.supportEmail,
          telephone: MARKETING_BRAND.supportPhone,
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
          email: MARKETING_BRAND.supportEmail,
          url: supportUrl,
          availableLanguage: ["ru", "en"],
        },
      ],
      areaServed: MARKETING_BRAND.regionCountries.map((code) => ({
        "@type": "Country",
        name: code,
      })),
      knowsAbout: [
        "авторазборка",
        "автосервис",
        "складской учёт автозапчастей",
        "заказ-наряды",
        "учёт двигателей",
        "программа для СТО",
      ],
      sameAs: [],
    },
    {
      "@context": "https://schema.org",
      "@type": "WebSite",
      "@id": `${marketingUrl}#website`,
      name: MARKETING_BRAND.name,
      url: marketingUrl,
      description: MARKETING_BRAND.shortDescription,
      inLanguage: MARKETING_BRAND.language,
      publisher: { "@id": `${marketingUrl}#organization` },
      copyrightHolder: { "@id": `${marketingUrl}#organization` },
    },
    {
      "@context": "https://schema.org",
      "@type": "SoftwareApplication",
      "@id": `${marketingUrl}#software`,
      name: MARKETING_BRAND.name,
      applicationCategory: "BusinessApplication",
      applicationSubCategory: "Automotive dismantling and repair shop software",
      operatingSystem: "Web, Windows, iOS, Android",
      description: MARKETING_BRAND.shortDescription,
      inLanguage: MARKETING_BRAND.language,
      image: defaultOgImage,
      screenshot: defaultOgImage,
      url: marketingUrl,
      downloadUrl: marketingAbsoluteUrl("download"),
      installUrl: appUrl,
      softwareVersion: "1",
      author: { "@id": `${marketingUrl}#organization` },
      publisher: { "@id": `${marketingUrl}#organization` },
      offers: {
        "@type": "AggregateOffer",
        lowPrice: "0",
        highPrice: "15",
        priceCurrency: "USD",
        offerCount: 2,
        offers: [
          {
            "@type": "Offer",
            name: "Пробный период 14 дней",
            price: "0",
            priceCurrency: "USD",
            url: `${appUrl}/demo`,
            availability: "https://schema.org/InStock",
            description: "Полный доступ на 14 дней без карты",
          },
          {
            "@type": "Offer",
            name: "Подписка Pro",
            price: "15",
            priceCurrency: "USD",
            url: marketingAbsoluteUrl("pricing"),
            availability: "https://schema.org/InStock",
            priceSpecification: {
              "@type": "UnitPriceSpecification",
              price: "15",
              priceCurrency: "USD",
              billingDuration: "P1M",
              referenceQuantity: {
                "@type": "QuantitativeValue",
                value: 1,
                unitText: "company",
              },
            },
            description: "Полный AutoCore для одной компании",
          },
        ],
      },
      audience: {
        "@type": "BusinessAudience",
        audienceType: "Авторазборки, автосервисы, магазины автозапчастей",
      },
      featureList: [
        "Складской учёт запчастей",
        "Заказ-наряды для автосервиса",
        "Учёт двигателей и моторов",
        "Бухгалтерия и проводки",
        "Mission Control для владельца",
        "RBAC и журнал активности",
        "Desktop Windows и мобильные приложения",
      ],
      countriesSupported: MARKETING_BRAND.regionCountries.join(", "),
    },
  ];
}

export function buildCollectionPageJsonLd(
  key: MarketingPathKey,
  name: string,
  description: string,
  items?: ReadonlyArray<string>,
) {
  const url = marketingAbsoluteUrl(key);

  return {
    "@context": "https://schema.org",
    "@type": "CollectionPage",
    "@id": `${url}#collection`,
    url,
    name,
    description,
    inLanguage: MARKETING_BRAND.language,
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

export function buildContactPageJsonLd() {
  const url = marketingAbsoluteUrl("contact");

  return {
    "@context": "https://schema.org",
    "@type": "ContactPage",
    "@id": `${url}#contact-page`,
    url,
    name: "Контакты AutoCore",
    description: "Демо, продажи, поддержка и партнёрства AutoCore.",
    inLanguage: MARKETING_BRAND.language,
    isPartOf: { "@id": `${marketingUrl}#website` },
    about: { "@id": `${marketingUrl}#organization` },
    mainEntity: {
      "@type": "Organization",
      "@id": `${marketingUrl}#organization`,
      name: MARKETING_BRAND.name,
      email: MARKETING_BRAND.supportEmail,
      telephone: MARKETING_BRAND.supportPhone,
      url: supportUrl,
    },
  };
}

export function buildPricingOfferJsonLd() {
  const url = marketingAbsoluteUrl("pricing");

  return {
    "@context": "https://schema.org",
    "@type": "Offer",
    "@id": `${url}#offer`,
    url,
    name: "AutoCore Pro",
    category: "SaaS subscription",
    price: "15",
    priceCurrency: "USD",
    priceSpecification: {
      "@type": "UnitPriceSpecification",
      price: "15",
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
    description: "Полный доступ к AutoCore для одной компании с 14-дневным пробным периодом.",
  };
}
