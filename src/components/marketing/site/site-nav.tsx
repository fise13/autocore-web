"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Menu, X } from "lucide-react";
import { useState } from "react";

import { AppLogo } from "@/components/brand/app-logo";
import { siteContent } from "@/components/marketing/content/site-content";
import { Button } from "@/components/ui/button";
import { marketingRoutes } from "@/lib/marketing-routes";
import { appLoginUrl } from "@/lib/site-urls";
import { cn } from "@/lib/utils";

const copy = siteContent.nav;

const NAV_LINKS = [
  { href: `${marketingRoutes.home}#graph`, label: copy.graph },
  { href: `${marketingRoutes.home}#modules`, label: copy.modules },
  { href: marketingRoutes.product, label: "Продукт" },
  { href: `${marketingRoutes.home}#process`, label: copy.process },
  { href: marketingRoutes.security, label: "Безопасность" },
  { href: `${marketingRoutes.home}#faq`, label: copy.faq },
  { href: marketingRoutes.pricing, label: "Тарифы" },
] as const;

export function SiteNav() {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);

  return (
    <header className="site-nav sticky top-0 z-50 border-b border-border/80 bg-background/95 backdrop-blur-md">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between gap-4 px-5 md:px-8">
        <Link href={marketingRoutes.home} className="flex items-center gap-2.5">
          <AppLogo size={32} priority />
          <span className="text-base font-semibold tracking-tight">AutoCore</span>
        </Link>

        <nav className="hidden items-center gap-0.5 lg:flex" aria-label="Основная навигация">
          {NAV_LINKS.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className={cn(
                "rounded-lg px-3 py-2 text-sm transition-colors",
                pathname === link.href.split("#")[0]
                  ? "bg-muted font-medium text-foreground"
                  : "text-muted-foreground hover:bg-muted/70 hover:text-foreground",
              )}
            >
              {link.label}
            </Link>
          ))}
        </nav>

        <div className="hidden md:flex">
          <Button variant="outline" size="sm" render={<Link href={appLoginUrl()} />}>
            {copy.signIn}
          </Button>
        </div>

        <button
          type="button"
          className="inline-flex size-10 items-center justify-center rounded-lg border border-border lg:hidden"
          aria-label={open ? "Закрыть" : "Меню"}
          onClick={() => setOpen((v) => !v)}
        >
          {open ? <X className="size-4" /> : <Menu className="size-4" />}
        </button>
      </div>

      {open ? (
        <nav className="border-t border-border px-5 py-4 lg:hidden">
          <ul className="space-y-1">
            {NAV_LINKS.map((link) => (
              <li key={link.href}>
                <Link
                  href={link.href}
                  className="block rounded-lg px-3 py-2.5 text-sm text-muted-foreground hover:bg-muted"
                  onClick={() => setOpen(false)}
                >
                  {link.label}
                </Link>
              </li>
            ))}
          </ul>
        </nav>
      ) : null}
    </header>
  );
}
