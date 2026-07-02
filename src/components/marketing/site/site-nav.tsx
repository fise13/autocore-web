"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Menu, X } from "lucide-react";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
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
const { primaryLinks, productGroup } = siteNavigation;

const NAV_LINKS = [
  { href: marketingRoutes.product, label: "Продукт" },
  ...primaryLinks,
];

export function SiteNav() {
  const pathname = usePathname();
  const scrolled = useScroll(8);
  const [open, setOpen] = useState(false);
  const reducedMotion = useReducedMotion();

  const closeAll = useCallback(() => {
    setOpen(false);
  }, []);

  useEffect(() => {
    closeAll();
  }, [pathname, closeAll]);

  useEffect(() => {
    if (!open) return;

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") closeAll();
    };

    window.addEventListener("keydown", onKeyDown);
    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener("keydown", onKeyDown);
    };
  }, [closeAll, open]);

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
          className={cn(
            "exp-site-header-toggle inline-flex size-10 items-center justify-center rounded-xl border border-border/70 lg:hidden",
            open && "exp-site-header-toggle--open",
          )}
          aria-label={open ? "Закрыть меню" : "Открыть меню"}
          aria-expanded={open}
          aria-controls="marketing-mobile-nav"
          onClick={() => setOpen((v) => !v)}
        >
          <span className="sr-only">{open ? "Закрыть меню" : "Открыть меню"}</span>
          <AnimatePresence mode="wait" initial={false}>
            <motion.span
              key={open ? "close" : "open"}
              initial={reducedMotion ? false : { opacity: 0, rotate: open ? -14 : 14, scale: 0.88 }}
              animate={{ opacity: 1, rotate: 0, scale: 1 }}
              exit={reducedMotion ? { opacity: 0 } : { opacity: 0, rotate: open ? 14 : -14, scale: 0.88 }}
              transition={{ duration: 0.18, ease: [0.22, 1, 0.36, 1] }}
            >
              {open ? <X className="size-4" /> : <Menu className="size-4" />}
            </motion.span>
          </AnimatePresence>
        </button>
      </div>

      <AnimatePresence>
        {open ? (
          <>
            <motion.button
              type="button"
              aria-label="Закрыть мобильное меню"
              className="exp-site-mobile-backdrop fixed inset-0 z-40 lg:hidden"
              onClick={closeAll}
              initial={reducedMotion ? false : { opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2, ease: [0.22, 1, 0.36, 1] }}
            />

            <motion.nav
              id="marketing-mobile-nav"
              className="exp-site-mobile-nav lg:hidden"
              aria-label="Мобильная навигация"
              initial={reducedMotion ? false : { opacity: 0, y: -14, scale: 0.98 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={reducedMotion ? { opacity: 0 } : { opacity: 0, y: -10, scale: 0.985 }}
              transition={{ duration: 0.24, ease: [0.16, 1, 0.3, 1] }}
            >
              <div className="exp-site-mobile-nav-inner">
                <div className="exp-site-mobile-nav-section">
                  <p className="exp-site-mobile-nav-label">Навигация</p>
                  <ul className="exp-site-mobile-nav-list">
                    {NAV_LINKS.map((link) => (
                      <li key={link.href}>
                        <Link
                          href={link.href}
                          className={cn(
                            "exp-site-mobile-nav-link",
                            isMarketingNavActive(pathname, link.href)
                              ? "exp-site-mobile-nav-link--active"
                              : "text-muted-foreground",
                          )}
                          onClick={closeAll}
                        >
                          <span>{link.label}</span>
                        </Link>
                      </li>
                    ))}
                  </ul>
                </div>

                <div className="exp-site-mobile-nav-section">
                  <p className="exp-site-mobile-nav-label">{productGroup.label}</p>
                  <ul className="exp-site-mobile-subnav-list">
                    {productGroup.items.slice(1).map((item) => (
                      <li key={item.href}>
                        <Link href={item.href} className="exp-site-mobile-subnav-link" onClick={closeAll}>
                          <span>{item.label}</span>
                          {item.description ? (
                            <span className="exp-site-mobile-subnav-description">{item.description}</span>
                          ) : null}
                        </Link>
                      </li>
                    ))}
                  </ul>
                </div>

                <div className="exp-site-mobile-cta-row">
                  <Button
                    variant="outline"
                    className="min-h-11 flex-1"
                    render={<Link href={appLoginUrl()} onClick={closeAll} />}
                    nativeButton={false}
                  >
                    {copy.signIn}
                  </Button>
                  <Button
                    className="min-h-11 flex-1"
                    render={<Link href={appDemoUrl()} onClick={closeAll} />}
                    nativeButton={false}
                  >
                    {copy.startFree}
                  </Button>
                </div>
              </div>
            </motion.nav>
          </>
        ) : null}
      </AnimatePresence>
    </header>
  );
}
