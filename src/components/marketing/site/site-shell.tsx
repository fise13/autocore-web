"use client";

import { ReactNode } from "react";

import { SiteFooter } from "@/components/marketing/site/site-footer";
import { SiteNav } from "@/components/marketing/site/site-nav";

type SiteShellProps = {
  children: ReactNode;
};

export function SiteShell({ children }: SiteShellProps) {
  return (
    <div className="site-theme flex min-h-screen flex-col bg-background text-foreground">
      <SiteNav />
      <main className="flex-1">{children}</main>
      <SiteFooter />
    </div>
  );
}
