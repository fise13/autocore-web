"use client";

import { Menu, X } from "lucide-react";
import NextLink from "next/link";
import { useLocale, useTranslations } from "next-intl";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { useCallback, useEffect, useRef, useState } from "react";

import { AppLogo } from "@/components/brand/app-logo";
import { isMarketingNavActive } from "@/components/marketing/site/site-navigation";
import { Button } from "@/components/ui/button";
import { useScroll } from "@/hooks/use-scroll";
import { Link, usePathname } from "@/i18n/navigation";
import type { MarketingPathname } from "@/i18n/routing";
import {
  storePreferredLocale,
  withLangQuery,
  type AppLocale,
} from "@/lib/locale/preferred-locale";
import { appDemoUrl, appLoginUrl } from "@/lib/site-urls";
import { cn } from "@/lib/utils";

const NAV_LINK_KEYS: Array<{ href: MarketingPathname; key: "product" | "pricing" }> = [
  { href: "/product", key: "product" },
  { href: "/pricing", key: "pricing" },
];

/** The sheet has room for the whole marketing map; the header bar does not. */
const SHEET_LINK_KEYS: Array<{ href: MarketingPathname; labelKey: string }> = [
  { href: "/product", labelKey: "nav.main.product" },
  { href: "/pricing", labelKey: "nav.primaryLinks.pricing" },
  { href: "/download", labelKey: "nav.primaryLinks.download" },
  { href: "/contact", labelKey: "nav.primaryLinks.contact" },
];

const FOCUSABLE_SELECTOR = 'a[href], button:not([disabled]), [tabindex]:not([tabindex="-1"])';

const DESKTOP_QUERY = "(min-width: 1024px)";

export function SiteNav() {
  const t = useTranslations("marketing");
  const locale = useLocale() as AppLocale;
  const pathname = usePathname();
  const scrolled = useScroll(8);
  const [open, setOpen] = useState(false);
  const reducedMotion = useReducedMotion();
  const demoHref = withLangQuery(appDemoUrl(), locale);
  const loginHref = withLangQuery(appLoginUrl(), locale);
  const panelRef = useRef<HTMLDivElement>(null);
  const toggleRef = useRef<HTMLButtonElement>(null);
  const restoreFocusRef = useRef(false);

  const navLinks = NAV_LINK_KEYS.map((link) => ({
    href: link.href,
    label: t(`nav.main.${link.key}`),
  }));

  const sheetLinks = SHEET_LINK_KEYS.map((link) => ({
    href: link.href,
    label: t(link.labelKey),
  }));

  const closeAll = useCallback((options?: { restoreFocus?: boolean }) => {
    restoreFocusRef.current = options?.restoreFocus ?? false;
    setOpen(false);
  }, []);

  useEffect(() => {
    closeAll();
  }, [pathname, closeAll]);

  /** A stale lock is worse than a stale panel: close once the desktop nav takes over. */
  useEffect(() => {
    const query = window.matchMedia(DESKTOP_QUERY);
    const sync = () => {
      if (query.matches) setOpen(false);
    };

    sync();
    query.addEventListener("change", sync);
    return () => query.removeEventListener("change", sync);
  }, []);

  useEffect(() => {
    if (!open) return;

    // iOS Safari keeps scrolling an `overflow: hidden` body once momentum starts;
    // pinning the body and replaying the offset on close is the lock that holds.
    const { body } = document;
    const scrollY = window.scrollY;
    const previous = {
      position: body.style.position,
      top: body.style.top,
      left: body.style.left,
      right: body.style.right,
      width: body.style.width,
      overflow: body.style.overflow,
    };

    body.style.position = "fixed";
    body.style.top = `-${scrollY}px`;
    body.style.left = "0";
    body.style.right = "0";
    body.style.width = "100%";
    body.style.overflow = "hidden";

    return () => {
      Object.assign(body.style, previous);
      window.scrollTo(0, scrollY);
    };
  }, [open]);

  useEffect(() => {
    if (!open) return;

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        closeAll({ restoreFocus: true });
        return;
      }

      if (event.key !== "Tab") return;

      const panel = panelRef.current;
      if (!panel) return;

      const focusable = Array.from(panel.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTOR));
      if (focusable.length === 0) return;

      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      const active = document.activeElement;

      if (event.shiftKey && (active === first || !panel.contains(active))) {
        event.preventDefault();
        last.focus();
        return;
      }

      if (!event.shiftKey && active === last) {
        event.preventDefault();
        first.focus();
      }
    };

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [closeAll, open]);

  useEffect(() => {
    if (!open) return;
    panelRef.current?.querySelector<HTMLElement>(FOCUSABLE_SELECTOR)?.focus();
  }, [open]);

  useEffect(() => {
    if (open || !restoreFocusRef.current) return;
    restoreFocusRef.current = false;
    toggleRef.current?.focus();
  }, [open]);

  return (
    <>
      <header
        className="site-nav exp-site-header sticky top-0 z-50 w-full"
        data-menu-open={open ? "true" : undefined}
      >
        <div
          className={cn(
            "exp-site-header-bar mx-auto flex h-16 w-full max-w-6xl items-center justify-between gap-3 px-4 sm:px-6",
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

          <nav
            className="hidden items-center gap-1 lg:flex"
            aria-label={t("nav.mobile.mainNavAria")}
          >
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

          {/* LanguageSwitcher unmounted while UI_LOCALE_LOCK pins the app to English. */}
          <div className="flex shrink-0 items-center gap-2 lg:gap-3">
            <Button
              variant="ghost"
              size="sm"
              className="hidden lg:inline-flex"
              render={<NextLink href={loginHref} onClick={() => storePreferredLocale(locale)} />}
              nativeButton={false}
            >
              {t("nav.signIn")}
            </Button>
            <Button
              size="sm"
              className="hidden whitespace-nowrap lg:inline-flex"
              render={<NextLink href={demoHref} onClick={() => storePreferredLocale(locale)} />}
              nativeButton={false}
            >
              {t("nav.startFree")}
            </Button>

            <button
              ref={toggleRef}
              type="button"
              className={cn(
                "exp-site-header-toggle inline-flex size-11 shrink-0 items-center justify-center rounded-xl border border-border/70 lg:hidden",
                open && "exp-site-header-toggle--open",
              )}
              aria-label={open ? t("nav.mobile.closeMenu") : t("nav.mobile.openMenu")}
              aria-expanded={open}
              aria-controls="marketing-mobile-nav"
              onClick={() => setOpen((v) => !v)}
            >
              <AnimatePresence mode="wait" initial={false}>
                <motion.span
                  key={open ? "close" : "open"}
                  initial={
                    reducedMotion ? false : { opacity: 0, rotate: open ? -14 : 14, scale: 0.88 }
                  }
                  animate={{ opacity: 1, rotate: 0, scale: 1 }}
                  exit={
                    reducedMotion
                      ? { opacity: 0 }
                      : { opacity: 0, rotate: open ? 14 : -14, scale: 0.88 }
                  }
                  transition={{ duration: 0.18, ease: [0.22, 1, 0.36, 1] }}
                >
                  {open ? <X className="size-5" /> : <Menu className="size-5" />}
                </motion.span>
              </AnimatePresence>
            </button>
          </div>
        </div>
      </header>

      {/*
        Outside the header on purpose: `backdrop-filter` there makes it a
        containing block, which would size this fixed sheet to the 64px bar.
      */}
      <AnimatePresence>
        {open ? (
          <>
            <motion.button
              type="button"
              tabIndex={-1}
              aria-label={t("nav.mobile.closeMobileMenu")}
              className="exp-site-mobile-backdrop lg:hidden"
              onClick={() => closeAll({ restoreFocus: true })}
              initial={reducedMotion ? false : { opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2, ease: [0.22, 1, 0.36, 1] }}
            />

            <motion.div
              ref={panelRef}
              id="marketing-mobile-nav"
              role="dialog"
              aria-modal="true"
              aria-label={t("nav.mobile.mobileNavAria")}
              className="exp-site-mobile-nav lg:hidden"
              initial={reducedMotion ? false : { opacity: 0, y: -12 }}
              animate={{ opacity: 1, y: 0 }}
              exit={reducedMotion ? { opacity: 0 } : { opacity: 0, y: -10 }}
              transition={{ duration: 0.24, ease: [0.16, 1, 0.3, 1] }}
            >
              <div className="exp-site-mobile-nav-inner">
                <nav
                  className="exp-site-mobile-nav-section"
                  aria-label={t("nav.mobile.mobileNavAria")}
                >
                  <p className="exp-site-mobile-nav-label">{t("nav.mobile.navigationLabel")}</p>
                  <ul className="exp-site-mobile-nav-list">
                    {sheetLinks.map((link) => (
                      <li key={link.href}>
                        <Link
                          href={link.href}
                          className={cn(
                            "exp-site-mobile-nav-link",
                            isMarketingNavActive(pathname, link.href)
                              ? "exp-site-mobile-nav-link--active"
                              : "text-muted-foreground",
                          )}
                          onClick={() => closeAll()}
                        >
                          <span>{link.label}</span>
                        </Link>
                      </li>
                    ))}
                  </ul>
                </nav>

                <div className="exp-site-mobile-cta-row">
                  <Button
                    variant="outline"
                    className="min-h-11 flex-1"
                    render={
                      <NextLink
                        href={loginHref}
                        onClick={() => {
                          storePreferredLocale(locale);
                          closeAll();
                        }}
                      />
                    }
                    nativeButton={false}
                  >
                    {t("nav.signIn")}
                  </Button>
                  <Button
                    className="min-h-11 flex-1"
                    render={
                      <NextLink
                        href={demoHref}
                        onClick={() => {
                          storePreferredLocale(locale);
                          closeAll();
                        }}
                      />
                    }
                    nativeButton={false}
                  >
                    {t("nav.startFree")}
                  </Button>
                </div>
              </div>
            </motion.div>
          </>
        ) : null}
      </AnimatePresence>
    </>
  );
}
