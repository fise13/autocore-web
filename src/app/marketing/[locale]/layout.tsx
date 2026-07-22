import type { ReactNode } from "react";
import { notFound } from "next/navigation";
import { NextIntlClientProvider } from "next-intl";
import { getMessages, setRequestLocale } from "next-intl/server";

import { MarketingBarbaLayout } from "@/components/marketing/motion/marketing-barba-layout";
import { LocaleHtmlLang } from "@/components/marketing/site/locale-html-lang";
import { routing } from "@/i18n/routing";
import { isAppLocale } from "@autocore/i18n/config";

type LocaleLayoutProps = {
  children: ReactNode;
  params: Promise<{ locale: string }>;
};

export function generateStaticParams() {
  return routing.locales.map((locale) => ({ locale }));
}

export default async function MarketingLocaleLayout({ children, params }: LocaleLayoutProps) {
  const { locale } = await params;
  if (!isAppLocale(locale) || !routing.locales.includes(locale)) {
    notFound();
  }

  setRequestLocale(locale);
  const messages = await getMessages();

  return (
    <NextIntlClientProvider locale={locale} messages={messages}>
      <LocaleHtmlLang />
      <MarketingBarbaLayout>{children}</MarketingBarbaLayout>
    </NextIntlClientProvider>
  );
}
