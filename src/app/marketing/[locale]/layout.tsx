import type { ReactNode } from "react";
import { notFound } from "next/navigation";
import { headers } from "next/headers";
import { NextIntlClientProvider } from "next-intl";
import { getMessages, setRequestLocale } from "next-intl/server";

import { MarketingBarbaLayout } from "@/components/marketing/motion/marketing-barba-layout";
import { PaddleCountryProvider } from "@/components/marketing/paddle-country-provider";
import { MarketingJsonLd } from "@/components/marketing/seo/marketing-json-ld";
import { LocaleHtmlLang } from "@/components/marketing/site/locale-html-lang";
import { routing, type AppLocale } from "@/i18n/routing";
import { detectCountryFromHeaders } from "@/lib/paddle/detect-country";

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

export default async function MarketingLocaleLayout({ children, params }: LocaleLayoutProps) {
  const { locale } = await params;
  if (!isMarketingLocale(locale)) {
    notFound();
  }

  setRequestLocale(locale);
  const messages = await getMessages();
  const country = detectCountryFromHeaders(await headers());

  return (
    <NextIntlClientProvider locale={locale} messages={messages}>
      <LocaleHtmlLang />
      <MarketingJsonLd locale={locale} />
      <PaddleCountryProvider country={country}>
        <MarketingBarbaLayout>{children}</MarketingBarbaLayout>
      </PaddleCountryProvider>
    </NextIntlClientProvider>
  );
}
