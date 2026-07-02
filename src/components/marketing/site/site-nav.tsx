"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Menu, X } from "lucide-react";
import { useCallback, useEffect, useState } from "react";

import { AppLogo } from "@/components/brand/app-logo";
import { landingContent } from "@/components/marketing/experience/content/landing-content";
import { isMarketingNavActive, siteNavigation } from "@/components/marketing/site/site-navigation";
import { Button } from "@/components/ui/button";
import { useScroll } from "@/hooks/use-scroll";
import { marketingRoutes } from "@/lib/marketing-routes";
import { appDemoUrl, appLoginUrl } from "@/lib/site-urls";
import { cn } from "@/lib/utils";

const copy = landingContent.nav;
const { primaryLinks } = siteNavigation;

const NAV_LINKS = [
  { href: marketingRoutes.product, label: "Продукт" },
  ...primaryLinks,
];

export function SiteNav() {
  const pathname = usePathname();
  const scrolled = useScroll(8);
  const [open, setOpen] = useState(false);

  const closeAll = useCallback(() => {
    setOpen(false);
  }, []);

  useEffect(() => {
    closeAll();
  }, [pathname, closeAll]);

  return (
    <header className="site-nav exp-site-header sticky top-0 z-50 w-full">
      <div
        className={cn(
          "exp-site-header-bar mx-auto flex h-16 w-full max-w-6xl items-center justify-between gap-4 px-4 sm:px-6",
          scrolled && "exp-site-header-bar--scrolled",
        )}
      >
        <Link
          href={marketingRoutes.home}
          className="flex shrink-0 items-center gap-2.5 rounded-md py-1 pr-2 transition-opacity hover:opacity-80"
        >
          <AppLogo size={28} priority />
          <span className="text-sm font-semibold tracking-tight">AutoCore</span>
        </Link>

        <nav className="hidden items-center gap-1 lg:flex" aria-label="Основная навигация">
          {NAV_LINKS.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className={cn(
                "rounded-md px-3 py-2 text-sm transition-colors",
                isMarketingNavActive(pathname, link.href)
                  ? "font-medium text-foreground"
                  : "text-muted-foreground hover:text-foreground",
              )}
            >
              {link.label}
            </Link>
          ))}
        </nav>

        <div className="hidden items-center gap-2 md:flex">
          <Button variant="ghost" size="sm" render={<Link href={appLoginUrl()} />} nativeButton={false}>
            {copy.signIn}
          </Button>
          <Button size="sm" render={<Link href={appDemoUrl()} />} nativeButton={false}>
            {copy.startFree}
          </Button>
        </div>

        <button
          type="button"
          className="inline-flex size-9 items-center justify-center rounded-md border border-border/70 lg:hidden"
          aria-label={open ? "Закрыть меню" : "Открыть меню"}
          aria-expanded={open}
          onClick={() => setOpen((v) => !v)}
        >
          {open ? <X className="size-4" /> : <Menu className="size-4" />}
        </button>
      </div>

      {open ? (
        <nav
          className="border-t border-border/60 bg-background px-4 py-4 lg:hidden"
          aria-label="Мобильная навигация"
        >
          <ul className="mx-auto flex max-w-6xl flex-col gap-1">
            {NAV_LINKS.map((link) => (
              <li key={link.href}>
                <Link
                  href={link.href}
                  className={cn(
                    "block rounded-md px-3 py-2.5 text-sm transition-colors hover:bg-muted/50 hover:text-foreground",
                    isMarketingNavActive(pathname, link.href)
                      ? "font-medium text-foreground"
                      : "text-muted-foreground",
                  )}
                  onClick={closeAll}
                >
                  {link.label}
                </Link>
              </li>
            ))}
            <li className="flex gap-2 pt-3">
              <Button variant="outline" className="flex-1" render={<Link href={appLoginUrl()} onClick={closeAll} />} nativeButton={false}>
                {copy.signIn}
              </Button>
              <Button className="flex-1" render={<Link href={appDemoUrl()} onClick={closeAll} />} nativeButton={false}>
                {copy.startFree}
              </Button>
            </li>
          </ul>
        </nav>
      ) : null}
    </header>
  );
}
