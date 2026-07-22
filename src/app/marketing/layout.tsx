import type { ReactNode } from "react";

import "@/styles/marketing-experience.css";

import { MarketingJsonLd } from "@/components/marketing/seo/marketing-json-ld";
import { YandexMetrika } from "@/components/marketing/seo/yandex-metrika";

export const dynamic = "force-static";
export const revalidate = 3600;

type MarketingLayoutProps = {
  children: ReactNode;
};

/** Outer marketing chrome (CSS + SEO). Nav/footer live under `[locale]` with next-intl. */
export default function MarketingLayout({ children }: MarketingLayoutProps) {
  return (
    <>
      <MarketingJsonLd />
      <YandexMetrika />
      {children}
    </>
  );
}
