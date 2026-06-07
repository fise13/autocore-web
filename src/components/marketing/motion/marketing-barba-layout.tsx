"use client";

import { ReactNode } from "react";

import { MarketingBarbaShell } from "@/components/marketing/motion/marketing-barba-shell";
import { MarketingMotionProvider } from "@/components/marketing/motion/marketing-motion-provider";

type MarketingBarbaLayoutProps = {
  children: ReactNode;
};

export function MarketingBarbaLayout({ children }: MarketingBarbaLayoutProps) {
  return (
    <MarketingMotionProvider>
      <MarketingBarbaShell>{children}</MarketingBarbaShell>
    </MarketingMotionProvider>
  );
}
