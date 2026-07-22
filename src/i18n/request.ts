import { getRequestConfig } from "next-intl/server";

import { routing } from "@/i18n/routing";
import type { AppLocale } from "@autocore/i18n/config";
import { isAppLocale } from "@autocore/i18n/config";

async function loadMarketingMessages(locale: AppLocale) {
  switch (locale) {
    case "ru":
      return (await import("../../packages/i18n/src/messages/ru/marketing.json")).default;
    case "en":
    default:
      return (await import("../../packages/i18n/src/messages/en/marketing.json")).default;
  }
}

export default getRequestConfig(async ({ requestLocale }) => {
  const requested = await requestLocale;
  const locale: AppLocale = isAppLocale(requested) ? requested : routing.defaultLocale;

  const marketing = await loadMarketingMessages(locale);

  return {
    locale,
    messages: {
      marketing,
    },
  };
});
