import type { Metadata } from "next";
import { ReactNode } from "react";

import "@/styles/marketing-landing.css";

import { MarketingJsonLd } from "@/components/marketing/seo/marketing-json-ld";
import { MarketingBarbaLayout } from "@/components/marketing/motion/marketing-barba-layout";
import { buildMarketingRootMetadata } from "@/lib/seo/build-marketing-metadata";

export const metadata: Metadata = buildMarketingRootMetadata();

export const revalidate = 3600;

type MarketingLayoutProps = {
  children: ReactNode;
};

export default function MarketingLayout({ children }: MarketingLayoutProps) {
  return (
    <>
      <MarketingJsonLd />
      <MarketingBarbaLayout>{children}</MarketingBarbaLayout>
    </>
  );
}
