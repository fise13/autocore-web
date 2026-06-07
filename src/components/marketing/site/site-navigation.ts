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
        description: "Mission Control, процессы и платформы",
      },
      {
        href: marketingRoutes.modules,
        label: "Каталог модулей",
        description: "Склад, наряды, бухгалтерия, команда",
      },
      {
        href: `${marketingRoutes.modules}#mission-control`,
        label: "Mission Control",
        description: "Командный дашборд владельца",
      },
      {
        href: `${marketingRoutes.modules}#warehouse`,
        label: "Склад",
        description: "Остатки, штрихкод, импорт",
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
    { href: `${marketingRoutes.home}#for-whom`, label: "Для кого" },
    { href: marketingRoutes.pricing, label: "Тарифы" },
    { href: marketingRoutes.security, label: "Безопасность" },
    { href: marketingRoutes.contact, label: "Контакты" },
  ] satisfies SiteNavLink[],
  footer: {
    product: [
      { href: marketingRoutes.product, label: "Обзор продукта" },
      { href: marketingRoutes.modules, label: "Каталог модулей" },
      { href: `${marketingRoutes.modules}#warehouse`, label: "Склад" },
      { href: `${marketingRoutes.modules}#work-orders`, label: "Заказ-наряды" },
      { href: `${marketingRoutes.home}#for-whom`, label: "Для кого" },
    ],
    company: [
      { href: marketingRoutes.pricing, label: "Тарифы" },
      { href: marketingRoutes.security, label: "Безопасность" },
      { href: marketingRoutes.contact, label: "Контакты" },
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
