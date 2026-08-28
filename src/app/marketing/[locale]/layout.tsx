import type { ReactNode } from "react";
import { notFound } from "next/navigation";
import { NextIntlClientProvider } from "next-intl";
import { getMessages, setRequestLocale } from "next-intl/server";

import { MarketingBarbaLayout } from "@/components/marketing/motion/marketing-barba-layout";
import { MarketingJsonLd } from "@/components/marketing/seo/marketing-json-ld";
import { routing, type AppLocale } from "@/i18n/routing";
import { buildMarketingRootMetadata } from "@/lib/seo/build-marketing-metadata";

type LocaleLayoutProps = {
  children: ReactNode;
  params: Promise<{ locale: string }>;
};

export function generateStaticParams() {
  return routing.locales.map((locale) => ({ locale }));
}

function isMarketingLocale(value: string): value is AppLocale {
  return (routing.locales as readonly string[]).includes(value);
}

/**
 * Site-wide defaults every marketing page inherits: title template, publisher,
 * and — the part that actually matters — the Search Console / Yandex Webmaster
 * verification tags. This layout previously rendered no metadata at all, which
 * left `buildMarketingRootMetadata` unreachable and
 * `NEXT_PUBLIC_GOOGLE_SITE_VERIFICATION` silently doing nothing.
 */
export async function generateMetadata({ params }: LocaleLayoutProps) {
  const { locale } = await params;
  if (!isMarketingLocale(locale)) return {};
  return buildMarketingRootMetadata(locale);
}

export default async function MarketingLocaleLayout({ children, params }: LocaleLayoutProps) {
  const { locale } = await params;
  if (!isMarketingLocale(locale)) {
    notFound();
  }

  setRequestLocale(locale);
  const messages = await getMessages();

  return (
    <NextIntlClientProvider locale={locale} messages={messages}>
      <MarketingJsonLd locale={locale} />
      <MarketingBarbaLayout>{children}</MarketingBarbaLayout>
    </NextIntlClientProvider>
  );
}
