import type { Metadata } from "next";
import { ReactNode } from "react";

import { getAppUrl, getMarketingUrl } from "@/lib/site-urls";

export const metadata: Metadata = {
  title: {
    default: "AutoCore — операционная система дилерского центра",
    template: "%s · AutoCore",
  },
  description:
    "Realtime-операции дилерского центра: склад, заказ-наряды, бухгалтерия и команда — единый Mission Control.",
  keywords: [
    "ПО для автодилера",
    "складской учёт",
    "CRM автосервиса",
    "управление запасами",
    "заказ-наряды",
    "бухгалтерия дилера",
    "операционный дашборд",
    "Mission Control",
  ],
  metadataBase: new URL(getMarketingUrl()),
  openGraph: {
    type: "website",
    locale: "ru_RU",
    siteName: "AutoCore",
    title: "AutoCore — операционная система дилерского центра",
    description:
      "Операционный центр вашего дилерского центра. Склад, заказ-наряды и бухгалтерия — синхронизированы в realtime.",
  },
  twitter: {
    card: "summary_large_image",
    title: "AutoCore — операционная система дилерского центра",
    description: "Realtime ПО для дилеров. Mission Control для всего бизнеса.",
  },
  alternates: {
    canonical: getMarketingUrl(),
  },
  robots: {
    index: true,
    follow: true,
  },
};

const jsonLd = {
  "@context": "https://schema.org",
  "@type": "SoftwareApplication",
  name: "AutoCore",
  applicationCategory: "BusinessApplication",
  operatingSystem: "Web, iOS, macOS",
  description:
    "Операционная система нового поколения для дилерских центров: склад, заказ-наряды, бухгалтерия и координация сотрудников в realtime.",
  inLanguage: "ru",
  offers: {
    "@type": "Offer",
    price: "0",
    priceCurrency: "RUB",
  },
  url: getMarketingUrl(),
  downloadUrl: getAppUrl(),
};

type MarketingLayoutProps = {
  children: ReactNode;
};

export default function MarketingLayout({ children }: MarketingLayoutProps) {
  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      {children}
    </>
  );
}
