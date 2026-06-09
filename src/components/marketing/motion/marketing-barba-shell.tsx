"use client";

import { usePathname } from "next/navigation";
import { ReactNode } from "react";

import { SiteFooter } from "@/components/marketing/site/site-footer";
import { SiteNav } from "@/components/marketing/site/site-nav";
import { useBarbaNavigation } from "@/hooks/use-barba-navigation";
import { useMarketingAuthBootstrap } from "@/hooks/use-marketing-auth-bootstrap";
import { pathToBarbaNamespace, shouldAnimateMarketingNavigation } from "@/lib/barba/barba-navigation";
import { cn } from "@/lib/utils";

type MarketingBarbaShellProps = {
  children: ReactNode;
};

export function MarketingBarbaShell({ children }: MarketingBarbaShellProps) {
  const pathname = usePathname();
  useMarketingAuthBootstrap();
  const { wrapperRef, containerRef } = useBarbaNavigation({
    shouldAnimate: shouldAnimateMarketingNavigation,
  });

  const namespace = pathToBarbaNamespace(pathname);

  return (
    <div
      ref={wrapperRef}
      data-barba="wrapper"
      className={cn("site-theme flex min-h-screen flex-col bg-background text-foreground")}
    >
      <SiteNav />
      <main
        ref={containerRef}
        data-barba="container"
        data-barba-namespace={namespace}
        className="flex-1"
      >
        {children}
      </main>
      <SiteFooter />
    </div>
  );
}
