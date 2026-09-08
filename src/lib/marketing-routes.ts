import type { AppLocale } from "@autocore/i18n/config";
import { DEFAULT_LOCALE } from "@autocore/i18n/config";

import {
  type MarketingPathKey,
  resolveMarketingPath,
} from "@/lib/seo/marketing-paths";

/**
 * Locale-aware marketing route helpers.
 * Prefer `Link` from `@/i18n/navigation` in client components.
 */
export function marketingRoute(
  key: MarketingPathKey,
  locale: AppLocale = DEFAULT_LOCALE,
): string {
  return resolveMarketingPath(key, locale);
}

/** Back-compat object — resolves to default (English) locale paths. */
export const marketingRoutes = {
  get home() {
    return resolveMarketingPath("home");
  },
  get product() {
    return resolveMarketingPath("product");
  },
  get modules() {
    return resolveMarketingPath("modules");
  },
  get howItWorks() {
    return resolveMarketingPath("howItWorks");
  },
  get pricing() {
    return resolveMarketingPath("pricing");
  },
  get security() {
    return resolveMarketingPath("security");
  },
  get contact() {
    return resolveMarketingPath("contact");
  },
  get download() {
    return resolveMarketingPath("download");
  },
  get downloadMobile() {
    return resolveMarketingPath("downloadMobile");
  },
  get privacy() {
    return resolveMarketingPath("privacy");
  },
  get refund() {
    return resolveMarketingPath("refund");
  },
  get terms() {
    return resolveMarketingPath("terms");
  },
} as const satisfies Record<MarketingPathKey, string>;
