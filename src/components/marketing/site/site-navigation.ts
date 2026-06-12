import { marketingRoutes } from "@/lib/marketing-routes";

export type SiteNavLink = {
  href: string;
  label: string;
  description?: string;
};

export type SiteNavGroup = {
  id: string;
  label: string;
  items: SiteNavLink[];
};

/** Единая карта навигации marketing-сайта (header + footer). */
export const siteNavigation = {
  productGroup: {
    id: "product",
    label: "Продукт",
    items: [
      {
        href: marketingRoutes.product,
        label: "Обзор продукта",
        description: "Как устроена система и для кого",
      },
      {
        href: marketingRoutes.modules,
        label: "Все модули",
        description: "Склад, наряды, бухгалтерия, команда",
      },
      {
        href: `${marketingRoutes.modules}#mission-control`,
        label: "Mission Control",
        description: "Дашборд владельца каждое утро",
      },
      {
        href: `${marketingRoutes.modules}#warehouse`,
        label: "Склад",
        description: "Остатки, штрихкод, импорт прайсов",
      },
      {
        href: `${marketingRoutes.modules}#work-orders`,
        label: "Заказ-наряды",
        description: "Цех, расходники, документы",
      },
      {
        href: `${marketingRoutes.modules}#accounting`,
        label: "Бухгалтерия",
        description: "Проводки из операций",
      },
    ],
  } satisfies SiteNavGroup,
  primaryLinks: [
    { href: `${marketingRoutes.home}#story`, label: "Как работает" },
    { href: marketingRoutes.pricing, label: "Тарифы" },
    { href: `${marketingRoutes.home}#faq`, label: "FAQ" },
    { href: marketingRoutes.security, label: "Безопасность" },
    { href: marketingRoutes.download, label: "Скачать" },
    { href: marketingRoutes.contact, label: "Контакты" },
  ] satisfies SiteNavLink[],
  footer: {
    product: [
      { href: marketingRoutes.product, label: "Обзор продукта" },
      { href: marketingRoutes.modules, label: "Каталог модулей" },
      { href: `${marketingRoutes.modules}#warehouse`, label: "Склад" },
      { href: `${marketingRoutes.modules}#work-orders`, label: "Заказ-наряды" },
      { href: `${marketingRoutes.home}#story`, label: "Как работает" },
    ],
    company: [
      { href: marketingRoutes.pricing, label: "Тарифы" },
      { href: marketingRoutes.security, label: "Безопасность" },
      { href: marketingRoutes.contact, label: "Контакты" },
      { href: marketingRoutes.download, label: "Скачать приложение" },
    ],
  },
} as const;

/** Активна ли ссылка на текущем pathname (без учёта hash). */
export function isMarketingNavActive(pathname: string, href: string): boolean {
  const path = href.split("#")[0] || href;
  if (path === marketingRoutes.home) {
    return pathname === marketingRoutes.home;
  }
  return pathname === path || pathname.startsWith(`${path}/`);
}

/** Активна ли группа «Продукт» (любая product/modules страница). */
export function isProductNavActive(pathname: string): boolean {
  return (
    pathname === marketingRoutes.product ||
    pathname === marketingRoutes.modules ||
    pathname.startsWith(`${marketingRoutes.modules}/`)
  );
}
