"use client";

import NextLink from "next/link";
import { useTranslations } from "next-intl";

import { AppLogo } from "@/components/brand/app-logo";
import { DesktopDownloadIcons } from "@/components/marketing/desktop-download-buttons";
import { TrialButton } from "@/components/marketing/experience/ui/trial-button";
import { Link } from "@/i18n/navigation";
import type { MarketingPathname } from "@/i18n/routing";
import { appLoginUrl } from "@/lib/site-urls";
import { getPlatformContacts } from "@/lib/platform/platform-contacts";

const contacts = getPlatformContacts();

type FooterLink = {
  href: MarketingPathname | { pathname: MarketingPathname; hash: string };
  label: string;
};

export function SiteFooter() {
  const t = useTranslations("marketing");
  const year = new Date().getFullYear();

  const columns: Array<{ title: string; items: FooterLink[] }> = [
    {
      title: t("footer.columns.product.title"),
      items: [
        { href: "/product", label: t("footer.columns.product.items.overview") },
        { href: "/modules", label: t("footer.columns.product.items.modules") },
        { href: "/pricing", label: t("footer.columns.product.items.pricing") },
        { href: "/download", label: t("footer.columns.product.items.download") },
      ],
    },
    {
      title: t("footer.columns.company.title"),
      items: [
        { href: "/how-it-works", label: t("footer.columns.company.items.howItWorks") },
        { href: "/security", label: t("footer.columns.company.items.security") },
        { href: "/contact", label: t("footer.columns.company.items.contact") },
      ],
    },
    {
      title: t("footer.columns.legal.title"),
      items: [
        { href: "/legal/privacy", label: t("footer.columns.legal.items.privacy") },
        { href: "/legal/refund", label: t("footer.columns.legal.items.refund") },
        { href: "/legal/terms", label: t("footer.columns.legal.items.terms") },
      ],
    },
  ];

  return (
    <footer className="exp-site-footer mt-auto">
      <div className="exp-site-footer-inner mx-auto flex w-full flex-col gap-12 px-4 py-14 sm:px-6 md:py-16">
        <div className="exp-site-footer-top grid gap-10 lg:grid-cols-[minmax(0,1.15fr)_minmax(0,1.6fr)] lg:items-start lg:gap-16">
          <div className="exp-site-footer-brand flex max-w-md flex-col gap-5">
            <Link href="/" className="inline-flex w-fit items-center gap-2.5 text-foreground">
              <AppLogo size={28} />
              <span className="text-sm font-semibold tracking-tight">{t("brand.name")}</span>
            </Link>

            <div className="space-y-2">
              <p className="text-[0.975rem] font-medium leading-snug tracking-tight text-foreground">
                {t("footer.headline")}
              </p>
              <p className="text-sm leading-relaxed text-muted-foreground">{t("footer.tagline")}</p>
            </div>

            <div className="flex flex-wrap items-center gap-3">
              <TrialButton className="exp-site-footer-cta h-9 px-4 text-sm">
                {t("footer.cta")}
              </TrialButton>
              <Link
                href="/contact"
                className="text-sm text-muted-foreground transition-colors hover:text-foreground"
              >
                {t("footer.contact")}
              </Link>
            </div>

            <DesktopDownloadIcons size="mini" />
          </div>

          <nav aria-label={t("footer.ariaLabel")} className="exp-site-footer-nav grid grid-cols-2 gap-8 sm:grid-cols-3">
            {columns.map((column) => (
              <div key={column.title} className="exp-site-footer-col">
                <p className="exp-site-footer-col-title">{column.title}</p>
                <ul className="exp-site-footer-col-list">
                  {column.items.map((link) => (
                    <li key={`${column.title}-${link.label}`}>
                      <Link href={link.href} className="exp-site-footer-link">
                        {link.label}
                      </Link>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </nav>
        </div>

        <div className="exp-site-footer-bottom flex flex-col gap-4 border-t border-border/50 pt-6 text-sm text-muted-foreground sm:flex-row sm:items-center sm:justify-between">
          <p>
            © {year} {t("brand.name")}
            <span className="mx-2 text-border">·</span>
            <span className="text-muted-foreground/80">{t("footer.locale")}</span>
          </p>
          <div className="exp-site-footer-meta flex flex-wrap items-center gap-x-4 gap-y-1">
            <a href={contacts.mailtoHref} className="hover:text-foreground">
              {contacts.email}
            </a>
            <a href={contacts.telHref} className="hover:text-foreground">
              {contacts.formattedPhone}
            </a>
            <NextLink href={appLoginUrl()} className="hover:text-foreground">
              {t("footer.signIn")}
            </NextLink>
          </div>
        </div>
      </div>
    </footer>
  );
}
