"use client";

import Link from "next/link";
import { LogIn, Mail, MessageCircle, Phone, PlayCircle } from "lucide-react";
import { motion, useReducedMotion } from "motion/react";
import type { ReactNode } from "react";

import { AppLogo } from "@/components/brand/app-logo";
import { landingPageContent } from "@/components/marketing/content/landing-page-content";
import { DesktopDownloadIcons } from "@/components/marketing/desktop-download-buttons";
import { siteNavigation } from "@/components/marketing/site/site-navigation";
import { marketingRoutes } from "@/lib/marketing-routes";
import { getPlatformContacts } from "@/lib/platform/platform-contacts";
import { appDemoUrl, appLoginUrl, getAppUrl, getMarketingUrl } from "@/lib/site-urls";
import { cn } from "@/lib/utils";

type FooterLink = {
  label: string;
  href: string;
  icon?: ReactNode;
  external?: boolean;
  detail?: string;
};

type FooterSection = {
  title: string;
  links: FooterLink[];
};

const contacts = getPlatformContacts();

const FOOTER_SECTIONS: FooterSection[] = [
  {
    title: "Продукт",
    links: siteNavigation.footer.product.map((link) => ({ label: link.label, href: link.href })),
  },
  {
    title: "Компания",
    links: [
      ...siteNavigation.footer.company.map((link) => ({ label: link.label, href: link.href })),
      { label: "Конфиденциальность", href: marketingRoutes.privacy },
    ],
  },
  {
    title: "Ресурсы",
    links: [
      { label: "Возможности", href: `${marketingRoutes.home}#features` },
      { label: "FAQ", href: `${marketingRoutes.home}#faq` },
      { label: "Каталог модулей", href: marketingRoutes.modules },
      { label: "Условия", href: marketingRoutes.terms },
    ],
  },
  {
    title: "Связь",
    links: [
      { label: "Попробовать демо", href: appDemoUrl(), icon: <PlayCircle aria-hidden /> },
      { label: "Войти", href: appLoginUrl(), icon: <LogIn aria-hidden /> },
      { label: "Контакты", href: marketingRoutes.contact, icon: <MessageCircle aria-hidden /> },
    ],
  },
];

const CONTACT_LINKS: FooterLink[] = [
  {
    label: "Email",
    href: contacts.mailtoHref,
    icon: <Mail aria-hidden />,
    external: true,
    detail: contacts.email,
  },
  {
    label: "Телефон",
    href: contacts.telHref,
    icon: <Phone aria-hidden />,
    external: true,
    detail: contacts.formattedPhone,
  },
];

function formatHost(url: string): string {
  return url.replace(/^https?:\/\//, "").replace(/\/$/, "");
}

export function SiteFooter() {
  const year = new Date().getFullYear();
  const copy = landingPageContent.footer;

  return (
    <div className="site-footer-shell">
      <footer
        className={cn(
          "site-footer-panel relative mx-auto flex w-full max-w-5xl flex-col rounded-t-[1.75rem] border border-b-0 px-5 sm:rounded-t-4xl sm:px-7 md:px-8",
          "bg-muted/20 dark:bg-[radial-gradient(40%_140px_at_50%_0%,color-mix(in_srgb,var(--foreground)_8%,transparent),transparent)]",
        )}
      >
        <div
          className="pointer-events-none absolute top-0 right-1/2 left-1/2 h-px w-2/5 max-w-xs -translate-x-1/2 -translate-y-1/2 rounded-full bg-foreground/15"
          aria-hidden
        />

        <div className="grid w-full gap-10 py-9 md:grid-cols-[minmax(0,1.1fr)_minmax(0,1.6fr)] md:gap-12 md:py-11">
          <FooterAnimatedBlock className="flex flex-col gap-5">
            <Link href={marketingRoutes.home} className="inline-flex w-fit items-center gap-3">
              <AppLogo size={30} />
              <span className="site-footer-brand-title text-[0.9375rem] font-semibold tracking-[-0.02em] text-foreground">
                AutoCore
              </span>
            </Link>
            <p className="site-footer-tagline max-w-[18rem] text-[0.8125rem] leading-[1.6] text-muted-foreground sm:text-sm">
              {copy.tagline}
            </p>
            <DesktopDownloadIcons size="mini" />
          </FooterAnimatedBlock>

          <div className="grid grid-cols-2 gap-x-6 gap-y-8 sm:grid-cols-2 sm:gap-x-8 md:grid-cols-4">
            {FOOTER_SECTIONS.map((section, index) => (
              <FooterAnimatedBlock key={section.title} delay={0.08 + index * 0.06}>
                <div className="flex flex-col gap-3.5">
                  <h3 className="site-footer-section-title text-[0.6875rem] font-semibold tracking-[0.1em] text-foreground/70 uppercase">
                    {section.title}
                  </h3>
                  <ul className="flex flex-col gap-2">
                    {section.links.map((link) => (
                      <li key={`${section.title}-${link.label}`}>
                        <FooterLinkItem link={link} />
                      </li>
                    ))}
                    {section.title === "Связь"
                      ? CONTACT_LINKS.map((link) => (
                          <li key={`contact-${link.label}`}>
                            <FooterContactItem link={link} />
                          </li>
                        ))
                      : null}
                  </ul>
                </div>
              </FooterAnimatedBlock>
            ))}
          </div>
        </div>

        <div className="h-px w-full bg-linear-to-r from-transparent via-border/80 to-transparent" aria-hidden />

        <div className="flex w-full flex-col items-start justify-between gap-3 py-5 sm:flex-row sm:items-center sm:gap-4">
          <p className="site-footer-meta text-[0.75rem] text-muted-foreground sm:text-sm">
            © {year} AutoCore. Все права защищены.
          </p>
          <p className="site-footer-meta text-[0.6875rem] leading-relaxed text-muted-foreground/75 sm:text-right">
            <span className="text-muted-foreground/90">{formatHost(getMarketingUrl())}</span>
            <span className="mx-2 text-border" aria-hidden>
              ·
            </span>
            <span>{formatHost(getAppUrl())}</span>
          </p>
        </div>
      </footer>
    </div>
  );
}

function FooterContactItem({ link }: { link: FooterLink }) {
  const className = cn(
    "site-footer-link flex min-w-0 max-w-full flex-col gap-0.5 text-[0.8125rem] leading-snug text-muted-foreground transition-colors duration-200",
    "hover:text-foreground",
  );

  return (
    <a className={className} href={link.href} rel="noreferrer">
      <span className="inline-flex min-w-0 items-center gap-1.5">
        <span className="shrink-0 opacity-80">{link.icon}</span>
        <span className="font-medium text-foreground/80">{link.label}</span>
      </span>
      {link.detail ? (
        <span className="break-all ps-5 text-[0.75rem] text-muted-foreground">{link.detail}</span>
      ) : null}
    </a>
  );
}

function FooterLinkItem({ link }: { link: FooterLink }) {
  const className = cn(
    "site-footer-link inline-flex min-w-0 max-w-full items-center text-[0.8125rem] leading-snug text-muted-foreground transition-colors duration-200",
    "hover:text-foreground",
    "[&_svg]:me-1.5 [&_svg]:size-3.5 [&_svg]:shrink-0 [&_svg]:opacity-80",
  );

  if (link.external || link.href.startsWith("mailto:")) {
    return (
      <a className={className} href={link.href} rel={link.external ? "noreferrer" : undefined}>
        {link.icon}
        {link.label}
      </a>
    );
  }

  return (
    <Link className={className} href={link.href}>
      {link.icon}
      {link.label}
    </Link>
  );
}

function FooterAnimatedBlock({
  className,
  delay = 0.08,
  children,
}: {
  delay?: number;
  className?: string;
  children: ReactNode;
}) {
  const shouldReduceMotion = useReducedMotion();

  if (shouldReduceMotion) {
    return <div className={className}>{children}</div>;
  }

  return (
    <motion.div
      className={className}
      initial={{ opacity: 0, translateY: 6 }}
      transition={{ delay, duration: 0.45, ease: [0.22, 1, 0.36, 1] }}
      viewport={{ once: true, margin: "-32px" }}
      whileInView={{ opacity: 1, translateY: 0 }}
    >
      {children}
    </motion.div>
  );
}
