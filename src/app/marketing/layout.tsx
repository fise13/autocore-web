import type { ReactNode } from "react";

import "@/styles/marketing-experience.css";

import { YandexMetrika } from "@/components/marketing/seo/yandex-metrika";

export const dynamic = "force-static";
export const revalidate = 3600;

type MarketingLayoutProps = {
  children: ReactNode;
};

/** Outer marketing chrome (CSS + analytics). Locale SEO lives under `[locale]`. */
export default function MarketingLayout({ children }: MarketingLayoutProps) {
  return (
    <>
      <YandexMetrika />
      {children}
    </>
  );
}
