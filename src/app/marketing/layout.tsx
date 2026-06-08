import type { Metadata } from "next";
import { ReactNode } from "react";

import { MarketingBarbaLayout } from "@/components/marketing/motion/marketing-barba-layout";
import { getAppUrl, getMarketingUrl } from "@/lib/site-urls";

export const metadata: Metadata = {
  title: {
    default: "AutoCore — программа для разборок, запчастей и СТО",
    template: "%s · AutoCore",
  },
  description:
    "От двигателя на складе до гарантийного талона — в одной системе. Учёт двигателей, заказ-наряды, гарантии и история автомобилей.",
  keywords: [
    "ПО для разборки авто",
    "учёт запчастей",
    "складской учёт автобизнес",
    "программа для СТО",
    "заказ-наряды",
    "продажа моторов",
    "бухгалтерия автосервиса",
    "Mission Control",
  ],
  metadataBase: new URL(getMarketingUrl()),
  openGraph: {
    type: "website",
    locale: "ru_RU",
    siteName: "AutoCore",
    title: "AutoCore — программа для разборок, запчастей и СТО",
    description:
      "Склад, цех и касса в одной системе. Без ночных сверок и «спроси у Пети на складе».",
  },
  twitter: {
    card: "summary_large_image",
    title: "AutoCore — программа для разборок, запчастей и СТО",
    description: "Одна правда для склада, цеха и бухгалтерии. Mission Control для владельца.",
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
    "Операционная система для разборок, магазинов запчастей и СТО: склад, заказ-наряды, бухгалтерия и команда в realtime.",
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
      <MarketingBarbaLayout>{children}</MarketingBarbaLayout>
    </>
  );
}
