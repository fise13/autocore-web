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
    "AutoCore — операционная система для авторазборок и автосервисов: склад, цех, заказ-наряды, документы и бухгалтерия в одном живом контуре.",
  supportEmail: platformContacts.email,
  supportPhone: platformContacts.phone,
  locale: "ru_RU",
  language: "ru",
  themeColor: "#0a0a0a",
} as const;

const marketingUrl = getMarketingUrl();
const appUrl = getAppUrl();
const supportUrl = `${marketingUrl.replace(/\/$/, "")}/contact`;
const defaultOgImage = `${marketingUrl.replace(/\/$/, "")}/opengraph-image`;

/** Human-readable titles for breadcrumb JSON-LD. */
const MARKETING_BREADCRUMB_TITLES: Record<MarketingPathKey, string> = {
  home: "Главная",
  product: "Продукт",
  modules: "Модули",
  pricing: "Тарифы",
  security: "Безопасность",
  contact: "Связаться",
  download: "Скачать",
  downloadMobile: "Mobile",
  privacy: "Конфиденциальность",
  terms: "Условия использования",
};

/** Core SEO keywords — авторазборки, автосервисы, смежные запросы. */
export const MARKETING_KEYWORDS = [
  "программа для авторазборки",
  "программа для автосервиса",
  "учёт запчастей авторазборка",
  "складской учёт автосервис",
  "ПО для разборки авто",
  "система для автосервиса",
  "заказ-наряды СТО",
  "учёт двигателей разборка",
  "программа для магазина автозапчастей",
  "бухгалтерия автосервиса",
  "CRM для авторазборки",
  "учёт моторов разборка",
  "AutoCore",
] as const;

export type MarketingSeoPageConfig = {
  key: MarketingPathKey;
  title: string;
  description: string;
  keywords?: string[];
  ogTitle?: string;
};

export const MARKETING_SEO_PAGES: Record<MarketingPathKey, MarketingSeoPageConfig> = {
  home: {
    key: "home",
    title: "AutoCore — операционная система для авторазборок и автосервисов",
    description:
      "Операционная система для авторазборок и автосервисов: наряды, склад, документы и синхронизация desktop↔mobile. Один источник правды для склада, цеха и офиса.",
    keywords: ["операционная система автосервис", "Mission Control", "демо авторазборка"],
    ogTitle: "AutoCore — операционная система для авторазборок и автосервисов",
  },
  product: {
    key: "product",
    title: "AutoCore — как проходит рабочий день в авторазборке и автосервисе",
    description:
      "От Mission Control до документов и синхронизации устройств: пошаговый обзор операционной системы AutoCore для склада, цеха и офиса.",
    keywords: ["операционная система автосервис", "рабочий процесс авторазборка", "Mission Control"],
    ogTitle: "AutoCore — операционная система для авторазборок и автосервисов",
  },
  modules: {
    key: "modules",
    title: "Модули для авторазборки и автосервиса — склад, наряды, моторы",
    description:
      "Каталог модулей AutoCore: склад запчастей, заказ-наряды, учёт двигателей, бухгалтерия, команда и Mission Control для авторазборок и СТО.",
    keywords: ["модуль склад автосервис", "учёт моторов программа"],
  },
  pricing: {
    key: "pricing",
    title: "Тарифы AutoCore для авторазборок и автосервисов",
    description:
      "Одна подписка $15 в месяц за компанию. Полный AutoCore без скрытых ограничений. 14 дней бесплатно, без карты.",
    keywords: ["цена программа автосервис", "тариф авторазборка"],
  },
  contact: {
    key: "contact",
    title: "Связаться с AutoCore — демо и поддержка для авторазборок",
    description:
      "Напишите команде AutoCore: демо, техническая поддержка, партнёрство или общий вопрос. Ответим в течение рабочего дня.",
    keywords: ["демо программа автосервис", "поддержка авторазборка"],
  },
  download: {
    key: "download",
    title: "Скачать AutoCore — desktop, web и mobile в одной экосистеме",
    description:
      "Установите AutoCore на Windows или откройте в браузере и на телефоне. Один аккаунт, синхронизация склада и нарядов в реальном времени.",
    keywords: ["скачать AutoCore", "desktop авторазборка", "веб программа для автосервиса", "синхронизация склад"],
  },
  downloadMobile: {
    key: "downloadMobile",
    title: "Скачать AutoCore на iPhone и Android",
    description:
      "Выберите iOS или Android и установите мобильное приложение AutoCore. Один аккаунт с desktop и web.",
    keywords: ["скачать AutoCore iOS", "AutoCore Android", "приложение автосервис"],
  },
  privacy: {
    key: "privacy",
    title: "Политика конфиденциальности AutoCore",
    description:
      "Как AutoCore обрабатывает персональные и операционные данные авторазборок и автосервисов: хранение, права пользователей, безопасность и контакты.",
    keywords: ["политика конфиденциальности", "обработка данных автосервис", "GDPR авторазборка"],
  },
  terms: {
    key: "terms",
    title: "Условия использования AutoCore",
    description:
      "Условия использования облачной программы AutoCore: учётная запись, подписка, данные клиента, ответственность и прекращение доступа.",
    keywords: ["условия использования", "SaaS автосервис", "лицензия AutoCore"],
  },
  security: {
    key: "security",
    title: "Безопасность AutoCore — RBAC, аудит и изоляция данных",
    description:
      "Безопасность AutoCore для операционного бизнеса: роли по модулям, журнал активности, multi-tenant изоляция и server-side проверки.",
    keywords: ["безопасность SaaS", "RBAC автосервис", "аудит складской системы"],
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
      url: marketingUrl,
      logo: `${marketingUrl}/icon`,
      description: MARKETING_BRAND.shortDescription,
      email: MARKETING_BRAND.supportEmail,
      telephone: MARKETING_BRAND.supportPhone,
      contactPoint: {
        "@type": "ContactPoint",
        contactType: "customer support",
        email: MARKETING_BRAND.supportEmail,
        telephone: MARKETING_BRAND.supportPhone,
        url: supportUrl,
        availableLanguage: ["ru"],
      },
      areaServed: { "@type": "Country", name: "RU" },
      knowsAbout: [
        "авторазборка",
        "автосервис",
        "складской учёт автозапчастей",
        "заказ-наряды",
        "учёт двигателей",
      ],
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
    },
    {
      "@context": "https://schema.org",
      "@type": "SoftwareApplication",
      "@id": `${marketingUrl}#software`,
      name: MARKETING_BRAND.name,
      applicationCategory: "BusinessApplication",
      applicationSubCategory: "Automotive repair shop management software",
      operatingSystem: "Web, iOS, Windows",
      description: MARKETING_BRAND.shortDescription,
      inLanguage: MARKETING_BRAND.language,
      image: defaultOgImage,
      offers: {
        "@type": "Offer",
        price: "0",
        priceCurrency: "USD",
        description: "14-дневный пробный период",
      },
      url: appUrl,
      downloadUrl: marketingAbsoluteUrl("download"),
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
      ],
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
    isPartOf: { "@id": `${marketingUrl}#website` },
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
    name: "Связаться с AutoCore",
    description: "Контакты AutoCore для демо, продаж, поддержки и партнёрств.",
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
