import { stripLocalePrefix } from "@/i18n/marketing-paths";
import type { MarketingPathname } from "@/i18n/routing";

export type SiteNavLinkHref = MarketingPathname | { pathname: MarketingPathname; hash: string };

export type SiteNavKeyLink = {
  href: SiteNavLinkHref;
  /** Key into `marketing.nav.productMenu.items.<key>` or `marketing.nav.primaryLinks.<key>`. */
  key: string;
};

/**
 * Locale-agnostic nav map (header + footer): hrefs and translation keys only.
 * Labels come from `marketing` messages via `useTranslations` in the consuming component —
 * no hardcoded copy lives here (see `site-nav.tsx` / `site-footer.tsx`).
 */
export const siteNavigation = {
  productGroup: {
    id: "product",
    items: [
      { href: "/product", key: "overview" },
      { href: "/modules", key: "modules" },
      { href: { pathname: "/modules", hash: "mission-control" }, key: "missionControl" },
      { href: { pathname: "/modules", hash: "warehouse" }, key: "warehouse" },
      { href: { pathname: "/modules", hash: "work-orders" }, key: "workOrders" },
      { href: { pathname: "/modules", hash: "accounting" }, key: "accounting" },
    ] satisfies SiteNavKeyLink[],
  },
  primaryLinks: [
    { href: "/pricing", key: "pricing" },
    { href: "/download", key: "download" },
    { href: "/contact", key: "contact" },
  ] satisfies SiteNavKeyLink[],
} as const;

/**
 * Is `href` active for `pathname`? Both may be locale-prefixed (e.g. `/en/product`)
 * or bare (e.g. `/product`, as returned by next-intl's `usePathname`) — prefixes are
 * stripped before comparing, and any `#hash` on `href` is ignored.
 */
export function isMarketingNavActive(pathname: string, href: string): boolean {
  const path = stripLocalePrefix(href.split("#")[0] || href);
  const current = stripLocalePrefix(pathname);
  if (path === "/") {
    return current === "/";
  }
  return current === path || current.startsWith(`${path}/`);
}

/** Is the "Product" nav group active (any product/modules page)? `pathname` may be locale-prefixed. */
export function isProductNavActive(pathname: string): boolean {
  const current = stripLocalePrefix(pathname);
  return current === "/product" || current === "/modules" || current.startsWith("/modules/");
}
