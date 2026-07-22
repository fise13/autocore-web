"use client";

import { Menu, X } from "lucide-react";
import NextLink from "next/link";
import { useTranslations } from "next-intl";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { useCallback, useEffect, useState } from "react";

import { AppLogo } from "@/components/brand/app-logo";
import { LanguageSwitcher } from "@/components/marketing/site/language-switcher";
import { isMarketingNavActive } from "@/components/marketing/site/site-navigation";
import { Button } from "@/components/ui/button";
import { useScroll } from "@/hooks/use-scroll";
import { Link, usePathname } from "@/i18n/navigation";
import type { MarketingPathname } from "@/i18n/routing";
import { appDemoUrl, appLoginUrl } from "@/lib/site-urls";
import { cn } from "@/lib/utils";

const NAV_LINK_KEYS: Array<{ href: MarketingPathname; key: "product" | "pricing" }> = [
  { href: "/product", key: "product" },
  { href: "/pricing", key: "pricing" },
];

export function SiteNav() {
  const t = useTranslations("marketing");
  const pathname = usePathname();
  const scrolled = useScroll(8);
  const [open, setOpen] = useState(false);
  const reducedMotion = useReducedMotion();

  const navLinks = NAV_LINK_KEYS.map((link) => ({
    href: link.href,
    label: t(`nav.main.${link.key}`),
  }));

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
          href="/"
          className="flex shrink-0 items-center gap-2.5 rounded-md py-1 pr-2 transition-opacity hover:opacity-80"
        >
          <AppLogo size={28} priority />
          <span className="text-sm font-semibold tracking-tight">{t("brand.name")}</span>
        </Link>

        <nav className="hidden items-center gap-1 lg:flex" aria-label={t("nav.mobile.mainNavAria")}>
          {navLinks.map((link) => (
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

        <div className="hidden items-center gap-3 md:flex">
          <LanguageSwitcher />
          <Button variant="ghost" size="sm" render={<NextLink href={appLoginUrl()} />} nativeButton={false}>
            {t("nav.signIn")}
          </Button>
          <Button size="sm" render={<NextLink href={appDemoUrl()} />} nativeButton={false}>
            {t("nav.startFree")}
          </Button>
        </div>

        <button
          type="button"
          className={cn(
            "exp-site-header-toggle inline-flex size-10 items-center justify-center rounded-xl border border-border/70 lg:hidden",
            open && "exp-site-header-toggle--open",
          )}
          aria-label={open ? t("nav.mobile.closeMenu") : t("nav.mobile.openMenu")}
          aria-expanded={open}
          aria-controls="marketing-mobile-nav"
          onClick={() => setOpen((v) => !v)}
        >
          <span className="sr-only">{open ? t("nav.mobile.closeMenu") : t("nav.mobile.openMenu")}</span>
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
              aria-label={t("nav.mobile.closeMobileMenu")}
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
              aria-label={t("nav.mobile.mobileNavAria")}
              initial={reducedMotion ? false : { opacity: 0, y: -14, scale: 0.98 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={reducedMotion ? { opacity: 0 } : { opacity: 0, y: -10, scale: 0.985 }}
              transition={{ duration: 0.24, ease: [0.16, 1, 0.3, 1] }}
            >
              <div className="exp-site-mobile-nav-inner">
                <div className="exp-site-mobile-nav-section">
                  <p className="exp-site-mobile-nav-label">{t("nav.mobile.navigationLabel")}</p>
                  <ul className="exp-site-mobile-nav-list">
                    {navLinks.map((link) => (
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

                <div className="exp-site-mobile-nav-section flex items-center justify-between">
                  <LanguageSwitcher />
                </div>

                <div className="exp-site-mobile-cta-row">
                  <Button
                    variant="outline"
                    className="min-h-11 flex-1"
                    render={<NextLink href={appLoginUrl()} onClick={closeAll} />}
                    nativeButton={false}
                  >
                    {t("nav.signIn")}
                  </Button>
                  <Button
                    className="min-h-11 flex-1"
                    render={<NextLink href={appDemoUrl()} onClick={closeAll} />}
                    nativeButton={false}
                  >
                    {t("nav.startFree")}
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
