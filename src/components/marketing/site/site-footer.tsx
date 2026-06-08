"use client";

import Link from "next/link";
import { Mail, PlayCircle, LogIn, MessageCircle } from "lucide-react";
import { motion, useReducedMotion } from "motion/react";
import type { ReactNode } from "react";

import { AppLogo } from "@/components/brand/app-logo";
import { landingPageContent } from "@/components/marketing/content/landing-page-content";
import { siteNavigation } from "@/components/marketing/site/site-navigation";
import { marketingRoutes } from "@/lib/marketing-routes";
import { appDemoUrl, appLoginUrl, getAppUrl, getMarketingUrl } from "@/lib/site-urls";
import { cn } from "@/lib/utils";

type FooterLink = {
  label: string;
  href: string;
  icon?: ReactNode;
  external?: boolean;
};

type FooterSection = {
  title: string;
  links: FooterLink[];
};

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
      {
        label: "support@autocore.app",
        href: "mailto:support@autocore.app",
        icon: <Mail aria-hidden />,
        external: true,
      },
      { label: "Контакты", href: marketingRoutes.contact, icon: <MessageCircle aria-hidden /> },
    ],
  },
];

export function SiteFooter() {
  const year = new Date().getFullYear();
  const copy = landingPageContent.footer;

  return (
    <div className="site-footer-shell">
      <footer
        className={cn(
          "site-footer-panel relative mx-auto flex w-full max-w-5xl flex-col items-center justify-center rounded-t-4xl border border-b-0 px-6 md:rounded-t-[2.5rem] md:px-8",
          "bg-muted/25 dark:bg-[radial-gradient(35%_128px_at_50%_0%,color-mix(in_srgb,var(--foreground)_10%,transparent),transparent)]",
        )}
      >
        <div
          className="pointer-events-none absolute top-0 right-1/2 left-1/2 h-px w-1/3 -translate-x-1/2 -translate-y-1/2 rounded-full bg-foreground/20 blur-sm"
          aria-hidden
        />

        <div className="grid w-full gap-8 py-8 md:py-10 lg:grid-cols-3 lg:gap-10">
          <FooterAnimatedBlock className="space-y-4">
            <Link href={marketingRoutes.home} className="inline-flex items-center gap-2.5">
              <AppLogo size={28} />
              <span className="text-sm font-semibold tracking-tight">AutoCore</span>
            </Link>
            <p className="max-w-xs text-sm leading-relaxed text-muted-foreground">{copy.tagline}</p>
          </FooterAnimatedBlock>

          <div className="mt-2 grid grid-cols-2 gap-8 sm:gap-10 md:grid-cols-4 lg:col-span-2 lg:mt-0">
            {FOOTER_SECTIONS.map((section, index) => (
              <FooterAnimatedBlock key={section.title} delay={0.1 + index * 0.08}>
                <div className="mb-8 md:mb-0">
                  <h3 className="text-xs font-medium tracking-wide text-foreground/80 uppercase">{section.title}</h3>
                  <ul className="mt-4 space-y-2.5 text-sm text-muted-foreground">
                    {section.links.map((link) => (
                      <li key={`${section.title}-${link.label}`}>
                        <FooterLinkItem link={link} />
                      </li>
                    ))}
                  </ul>
                </div>
              </FooterAnimatedBlock>
            ))}
          </div>
        </div>

        <div className="h-px w-full bg-linear-to-r from-transparent via-border to-transparent" aria-hidden />

        <div className="flex w-full flex-col items-center justify-center gap-2 py-5 text-center">
          <p className="text-sm text-muted-foreground">© {year} AutoCore. Все права защищены.</p>
          <p className="text-xs text-muted-foreground/80">
            Сайт · {getMarketingUrl().replace(/^https?:\/\//, "")} · Приложение ·{" "}
            {getAppUrl().replace(/^https?:\/\//, "")}
          </p>
        </div>
      </footer>
    </div>
  );
}

function FooterLinkItem({ link }: { link: FooterLink }) {
  const className =
    "inline-flex items-center transition-colors duration-200 hover:text-foreground [&_svg]:me-1.5 [&_svg]:size-3.5";

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
  delay = 0.1,
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
      initial={{ filter: "blur(4px)", translateY: -8, opacity: 0 }}
      transition={{ delay, duration: 0.7, ease: [0.22, 1, 0.36, 1] }}
      viewport={{ once: true, margin: "-40px" }}
      whileInView={{ filter: "blur(0px)", translateY: 0, opacity: 1 }}
    >
      {children}
    </motion.div>
  );
}
