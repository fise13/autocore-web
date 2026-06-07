"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { ChevronDown, Menu, X } from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";

import { AppLogo } from "@/components/brand/app-logo";
import { landingPageContent } from "@/components/marketing/content/landing-page-content";
import {
  isMarketingNavActive,
  isProductNavActive,
  siteNavigation,
} from "@/components/marketing/site/site-navigation";
import { Button } from "@/components/ui/button";
import { marketingRoutes } from "@/lib/marketing-routes";
import { appLoginUrl } from "@/lib/site-urls";
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
    <header className="site-nav sticky top-0 z-50 border-b border-border/80 bg-background/95 backdrop-blur-md">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between gap-4 px-5 md:px-8">
        <Link href={marketingRoutes.home} className="flex shrink-0 items-center gap-2.5">
          <AppLogo size={32} priority />
          <span className="text-base font-semibold tracking-tight">AutoCore</span>
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
                <div className="w-[min(24rem,calc(100vw-2rem))] rounded-2xl border border-border bg-popover p-2 shadow-xl">
                  <div className="grid gap-0.5">
                    {productGroup.items.map((item) => (
                      <Link
                        key={item.href}
                        href={item.href}
                        className="site-nav-dropdown-item rounded-xl px-3 py-2.5 transition-colors hover:bg-muted"
                        onClick={() => setProductOpen(false)}
                      >
                        <span className="block text-sm font-medium">{item.label}</span>
                        {item.description ? (
                          <span className="mt-0.5 block text-xs text-muted-foreground">{item.description}</span>
                        ) : null}
                      </Link>
                    ))}
                  </div>
                </div>
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

        <div className="hidden items-center gap-2 md:flex">
          <Button variant="ghost" size="sm" render={<Link href={appLoginUrl()} />}>
            {copy.signIn}
          </Button>
          <Button size="sm" render={<Link href={appLoginUrl()} />}>
            {copy.startFree}
          </Button>
        </div>

        <button
          type="button"
          className="inline-flex size-10 items-center justify-center rounded-lg border border-border lg:hidden"
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
                <ul className="mb-2 ml-2 space-y-0.5 border-l border-border pl-3">
                  {productGroup.items.map((item) => (
                    <li key={item.href}>
                      <Link
                        href={item.href}
                        className="block rounded-lg px-3 py-2 text-sm text-muted-foreground hover:bg-muted hover:text-foreground"
                        onClick={closeAll}
                      >
                        {item.label}
                      </Link>
                    </li>
                  ))}
                </ul>
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

            <li className="flex gap-2 pt-3">
              <Button variant="outline" className="flex-1" render={<Link href={appLoginUrl()} onClick={closeAll} />}>
                {copy.signIn}
              </Button>
              <Button className="flex-1" render={<Link href={appLoginUrl()} onClick={closeAll} />}>
                {copy.startFree}
              </Button>
            </li>
          </ul>
        </nav>
      ) : null}
    </header>
  );
}
