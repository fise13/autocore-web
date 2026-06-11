import type { MarketingPathKey } from "@/lib/seo/marketing-paths";
import { marketingAbsoluteUrl } from "@/lib/seo/marketing-paths";
import { getAppUrl, getMarketingUrl } from "@/lib/site-urls";

export const MARKETING_BRAND = {
  name: "AutoCore",
  legalName: "AutoCore",
  tagline: "Программа для авторазборок и автосервисов",
  shortDescription:
    "AutoCore — облачная программа для авторазборок и автосервисов: склад запчастей, учёт двигателей, заказ-наряды, гарантии и бухгалтерия в одной системе.",
  supportEmail: "support@autocore.app",
  locale: "ru_RU",
  language: "ru",
  themeColor: "#0a0a0a",
} as const;

/** Human-readable titles for breadcrumb JSON-LD. */
const MARKETING_BREADCRUMB_TITLES: Record<MarketingPathKey, string> = {
  home: "Главная",
  product: "Продукт",
  modules: "Модули",
  pricing: "Тарифы",
  security: "Безопасность",
  contact: "Контакты",
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
    title: "AutoCore — программа для авторазборок и автосервисов",
    description:
      "Облачная программа для авторазборок и автосервисов: склад запчастей, учёт двигателей, заказ-наряды, гарантии и бухгалтерия. Одна система для склада, цеха и офиса.",
    keywords: ["Mission Control", "демо авторазборка", "учёт запчастей онлайн"],
    ogTitle: "AutoCore — программа для авторазборок и автосервисов",
  },
  product: {
    key: "product",
    title: "Программа для авторазборок и автосервисов — обзор AutoCore",
    description:
      "Как AutoCore связывает склад, цех и бухгалтерию авторазборки или автосервиса: Mission Control, realtime-синхронизация, документы и единая база остатков.",
    keywords: ["операционная система автосервис", "Mission Control авторазборка"],
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
      "Пробный период 14 дней без карты. Тариф Pro для растущей авторазборки или автосервиса — полный контур склада, нарядов и бухгалтерии.",
    keywords: ["цена программа автосервис", "тариф авторазборка"],
  },
  security: {
    key: "security",
    title: "Безопасность AutoCore — RBAC для автосервиса и авторазборки",
    description:
      "Роли по модулям, журнал активности, изоляция данных компаний и server-side проверки для многопользовательской работы авторазборки или СТО.",
    keywords: ["безопасность учёт автосервис", "RBAC авторазборка"],
  },
  contact: {
    key: "contact",
    title: "Контакты AutoCore — демо для авторазборок и автосервисов",
    description:
      "Запросите демо, внедрение и миграцию склада из Excel для вашей авторазборки или автосервиса. Поддержка и корпоративный доступ.",
    keywords: ["демо программа автосервис", "внедрение авторазборка"],
  },
  privacy: {
    key: "privacy",
    title: "Политика конфиденциальности AutoCore",
    description: "Как AutoCore обрабатывает персональные данные пользователей авторазборок и автосервисов.",
  },
  terms: {
    key: "terms",
    title: "Условия использования AutoCore",
    description: "Условия использования облачной программы AutoCore для авторазборок и автосервисов.",
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
  const marketingUrl = getMarketingUrl();
  const appUrl = getAppUrl();

  return [
    {
      "@context": "https://schema.org",
      "@type": "Organization",
      name: MARKETING_BRAND.name,
      url: marketingUrl,
      logo: `${marketingUrl}/icon`,
      description: MARKETING_BRAND.shortDescription,
      email: MARKETING_BRAND.supportEmail,
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
      name: MARKETING_BRAND.name,
      url: marketingUrl,
      description: MARKETING_BRAND.shortDescription,
      inLanguage: MARKETING_BRAND.language,
      publisher: { "@type": "Organization", name: MARKETING_BRAND.name },
    },
    {
      "@context": "https://schema.org",
      "@type": "SoftwareApplication",
      name: MARKETING_BRAND.name,
      applicationCategory: "BusinessApplication",
      applicationSubCategory: "Automotive repair shop management software",
      operatingSystem: "Web, iOS, macOS, Windows",
      description: MARKETING_BRAND.shortDescription,
      inLanguage: MARKETING_BRAND.language,
      offers: {
        "@type": "Offer",
        price: "0",
        priceCurrency: "USD",
        description: "14-дневный пробный период",
      },
      url: appUrl,
      downloadUrl: marketingAbsoluteUrl("home"),
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
