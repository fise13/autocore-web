"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { ChevronDown, Menu, X } from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";

import { AppLogo } from "@/components/brand/app-logo";
import { landingPageContent } from "@/components/marketing/content/landing-page-content";
import { ProductNavMenu } from "@/components/marketing/site/product-nav-menu";
import {
  isMarketingNavActive,
  isProductNavActive,
  siteNavigation,
} from "@/components/marketing/site/site-navigation";
import { Button } from "@/components/ui/button";
import { useScroll } from "@/hooks/use-scroll";
import { marketingRoutes } from "@/lib/marketing-routes";
import { appDemoUrl, appLoginUrl } from "@/lib/site-urls";
import { cn } from "@/lib/utils";

const copy = landingPageContent.nav;
const { productGroup, primaryLinks } = siteNavigation;

function NavLink({
  href,
  label,
  active,
  onNavigate,
  className,
}: {
  href: string;
  label: string;
  active?: boolean;
  onNavigate?: () => void;
  className?: string;
}) {
  return (
    <Link
      href={href}
      onClick={onNavigate}
      className={cn(
        "rounded-lg px-3 py-2 text-sm transition-colors",
        active
          ? "bg-muted font-medium text-foreground"
          : "text-muted-foreground hover:bg-muted/70 hover:text-foreground",
        className,
      )}
    >
      {label}
    </Link>
  );
}

export function SiteNav() {
  const pathname = usePathname();
  const scrolled = useScroll(10);
  const [open, setOpen] = useState(false);
  const [productOpen, setProductOpen] = useState(false);
  const [mobileProductOpen, setMobileProductOpen] = useState(false);
  const productRef = useRef<HTMLDivElement>(null);

  const closeAll = useCallback(() => {
    setOpen(false);
    setProductOpen(false);
    setMobileProductOpen(false);
  }, []);

  useEffect(() => {
    closeAll();
  }, [pathname, closeAll]);

  useEffect(() => {
    if (!productOpen) return;
    const onPointerDown = (event: MouseEvent) => {
      if (productRef.current && !productRef.current.contains(event.target as Node)) {
        setProductOpen(false);
      }
    };
    document.addEventListener("pointerdown", onPointerDown);
    return () => document.removeEventListener("pointerdown", onPointerDown);
  }, [productOpen]);

  const productActive = isProductNavActive(pathname);

  return (
    <header
      className={cn(
        "site-nav sticky top-0 z-50 w-full transition-[background-color,border-color,backdrop-filter] duration-300",
        scrolled
          ? "border-b border-border/80 bg-background/95 perf-backdrop-blur supports-backdrop-filter:bg-background/80"
          : "border-b border-transparent bg-transparent",
      )}
    >
      <div className="site-nav-inner">
        <div className="site-nav-brand-group">
          <Link
            href={marketingRoutes.home}
            className="site-nav-logo flex shrink-0 items-center gap-2.5 rounded-lg px-2 py-1.5 transition-colors hover:bg-muted/60"
          >
            <AppLogo size={28} priority />
            <span className="text-sm font-semibold tracking-tight md:text-base">AutoCore</span>
          </Link>

          <nav className="hidden items-center gap-0.5 lg:flex" aria-label="Основная навигация">
          <div
            ref={productRef}
            className="relative"
            onMouseEnter={() => setProductOpen(true)}
            onMouseLeave={() => setProductOpen(false)}
          >
            <button
              type="button"
              className={cn(
                "inline-flex items-center gap-1 rounded-lg px-3 py-2 text-sm transition-colors",
                productActive || productOpen
                  ? "bg-muted font-medium text-foreground"
                  : "text-muted-foreground hover:bg-muted/70 hover:text-foreground",
              )}
              aria-expanded={productOpen}
              aria-haspopup="true"
              onClick={() => setProductOpen((v) => !v)}
            >
              {productGroup.label}
              <ChevronDown
                className={cn("size-3.5 transition-transform", productOpen && "rotate-180")}
                aria-hidden
              />
            </button>

            {productOpen ? (
              <div className="site-nav-dropdown absolute left-0 top-full z-50 pt-2">
                <ProductNavMenu onNavigate={() => setProductOpen(false)} />
              </div>
            ) : null}
          </div>

          {primaryLinks.map((link) => (
            <NavLink
              key={link.href}
              href={link.href}
              label={link.label}
              active={isMarketingNavActive(pathname, link.href)}
            />
          ))}
          </nav>
        </div>

        <div className="hidden items-center gap-2 md:flex">
          <Button variant="ghost" size="sm" render={<Link href={appLoginUrl()} />}>
            {copy.signIn}
          </Button>
          <Button size="sm" render={<Link href={appDemoUrl()} />}>
            {copy.startFree}
          </Button>
        </div>

        <button
          type="button"
          className="inline-flex size-9 items-center justify-center rounded-lg border border-border/80 lg:hidden"
          aria-label={open ? "Закрыть меню" : "Открыть меню"}
          aria-expanded={open}
          onClick={() => setOpen((v) => !v)}
        >
          {open ? <X className="size-4" /> : <Menu className="size-4" />}
        </button>
      </div>

      {open ? (
        <nav className="border-t border-border px-5 py-4 lg:hidden" aria-label="Мобильная навигация">
          <ul className="space-y-1">
            <li>
              <button
                type="button"
                className="flex w-full items-center justify-between rounded-lg px-3 py-2.5 text-sm font-medium"
                onClick={() => setMobileProductOpen((v) => !v)}
                aria-expanded={mobileProductOpen}
              >
                {productGroup.label}
                <ChevronDown
                  className={cn("size-4 text-muted-foreground transition-transform", mobileProductOpen && "rotate-180")}
                />
              </button>
              {mobileProductOpen ? (
                <div className="mb-2 ml-1 border-l border-border pl-3">
                  <ProductNavMenu onNavigate={closeAll} className="shadow-none border-0 bg-transparent w-full" />
                </div>
              ) : null}
            </li>

            {primaryLinks.map((link) => (
              <li key={link.href}>
                <Link
                  href={link.href}
                  className={cn(
                    "block rounded-lg px-3 py-2.5 text-sm",
                    isMarketingNavActive(pathname, link.href)
                      ? "bg-muted font-medium text-foreground"
                      : "text-muted-foreground hover:bg-muted",
                  )}
                  onClick={closeAll}
                >
                  {link.label}
                </Link>
              </li>
            ))}

            <li className="space-y-2 pt-3">
              <div className="flex gap-2">
                <Button variant="outline" className="flex-1" render={<Link href={appLoginUrl()} onClick={closeAll} />}>
                  {copy.signIn}
                </Button>
                <Button className="flex-1" render={<Link href={appDemoUrl()} onClick={closeAll} />}>
                  {copy.startFree}
                </Button>
              </div>
            </li>
          </ul>
        </nav>
      ) : null}
    </header>
  );
}
