"use client";

import Link from "next/link";
import { Menu, X } from "lucide-react";
import { useEffect, useState } from "react";

import { AppLogo } from "@/components/brand/app-logo";
import { landingCopy } from "@/components/marketing/copy/landing-copy";
import { Button } from "@/components/ui/button";
import { appDashboardUrl, appLoginUrl } from "@/lib/site-urls";
import { cn } from "@/lib/utils";

const copy = landingCopy.nav;

const LINKS = [
  { href: "#realtime", label: copy.realtime },
  { href: "#workflows", label: copy.workflows },
  { href: "#mission-control", label: copy.missionControl },
  { href: "#platform", label: copy.platform },
  { href: "#security", label: copy.security },
] as const;

export function MarketingNav() {
  const [open, setOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 24);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <header
      className={cn(
        "sticky top-0 z-50 transition-[background,border-color] duration-300",
        scrolled ? "landing-nav border-border/60" : "border-transparent bg-transparent",
      )}
    >
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between gap-4 px-5 md:h-[4.25rem] md:px-8">
        <Link href="/" className="flex items-center gap-2.5">
          <AppLogo size={32} priority />
          <span className="text-base font-semibold tracking-tight">AutoCore</span>
        </Link>

        <nav className="hidden items-center gap-8 md:flex">
          {LINKS.map((link) => (
            <a
              key={link.href}
              href={link.href}
              className="text-sm text-muted-foreground transition-colors hover:text-foreground"
            >
              {link.label}
            </a>
          ))}
        </nav>

        <div className="hidden items-center gap-2 md:flex">
          <Button variant="ghost" size="sm" render={<a href={appLoginUrl()} />}>
            {copy.signIn}
          </Button>
          <Button size="sm" render={<a href={appDashboardUrl()} />}>
            {copy.openDashboard}
          </Button>
        </div>

        <button
          type="button"
          className="inline-flex size-10 items-center justify-center rounded-lg border border-border/60 md:hidden"
          aria-label={open ? "Закрыть меню" : "Открыть меню"}
          onClick={() => setOpen((value) => !value)}
        >
          {open ? <X className="size-4" /> : <Menu className="size-4" />}
        </button>
      </div>

      <div className={cn("border-t border-border/50 md:hidden", open ? "block" : "hidden")}>
        <div className="mx-auto flex max-w-7xl flex-col gap-4 px-5 py-5">
          {LINKS.map((link) => (
            <a
              key={link.href}
              href={link.href}
              className="text-base text-muted-foreground"
              onClick={() => setOpen(false)}
            >
              {link.label}
            </a>
          ))}
          <div className="flex gap-2 pt-2">
            <Button variant="outline" className="flex-1" render={<a href={appLoginUrl()} />}>
              {copy.signIn}
            </Button>
            <Button className="flex-1" render={<a href={appDashboardUrl()} />}>
              {copy.openDashboard}
            </Button>
          </div>
        </div>
      </div>
    </header>
  );
}
