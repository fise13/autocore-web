"use client";

import { useTranslations } from "next-intl";
import { type ReactNode } from "react";
import { motion, useReducedMotion } from "motion/react";
import { ArrowUpRight, FileText, Shield } from "lucide-react";

import { useMarketingPages } from "@/components/marketing/content/use-marketing-pages";
import { Link } from "@/i18n/navigation";
import { getPlatformContacts } from "@/lib/platform/platform-contacts";

const EASE = [0.16, 1, 0.3, 1] as const;
const supportEmail = getPlatformContacts().email;

type LegalSection = {
  id: string;
  title: string;
  paragraphs: string[];
  bullets?: string[];
};

type HeroRevealProps = {
  children: ReactNode;
  className?: string;
  delay: number;
  duration: number;
  y?: number;
};

function HeroReveal({ children, className, delay, duration, y = 18 }: HeroRevealProps) {
  const reduced = useReducedMotion();

  return (
    <motion.div
      className={className}
      initial={reduced ? false : { opacity: 0, y }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration, delay, ease: EASE }}
    >
      {children}
    </motion.div>
  );
}

type ScrollRevealProps = {
  children: ReactNode;
  className?: string;
  delay?: number;
  y?: number;
  margin?: string;
};

function ScrollReveal({
  children,
  className,
  delay = 0,
  y = 14,
  margin = "-60px",
}: ScrollRevealProps) {
  const reduced = useReducedMotion();

  return (
    <motion.div
      className={className}
      initial={reduced ? false : { opacity: 0, y }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin }}
      transition={{ duration: 0.5, delay, ease: EASE }}
    >
      {children}
    </motion.div>
  );
}

type LegalExperienceProps = {
  documentKey: LegalDocumentKey;
};

type LegalDocumentKey = "privacy" | "refund" | "terms";

const HUB_LINKS = [
  { key: "security" as const, href: "/security", icon: Shield },
  { key: "privacy" as const, href: "/legal/privacy", icon: FileText },
  { key: "refund" as const, href: "/legal/refund", icon: FileText },
  { key: "terms" as const, href: "/legal/terms", icon: FileText },
] as const;

export function LegalExperience({ documentKey }: LegalExperienceProps) {
  const t = useTranslations(`marketing.pages.${documentKey}`);
  const a11y = useTranslations("marketing.a11y.legal");
  const pagesLegal = useMarketingPages().legal;
  const title = t("title");
  const description = t("description");
  const breadcrumb = t("breadcrumb");
  const updated = t("updated");
  const contactLabel = t("contactLabel");
  const sections = t.raw("sections") as LegalSection[];

  return (
    <div className="trust-page">
      <section className="trust-panel trust-panel-hero" aria-label={title}>
        <div className="exp-section-inner trust-panel-inner">
          <nav className="trust-breadcrumbs" aria-label={a11y("breadcrumbsAria")}>
            <Link href="/">AutoCore</Link>
            <span aria-hidden>/</span>
            <span>{breadcrumb}</span>
          </nav>

          <HeroReveal delay={0} duration={0.68} y={20}>
            <h1 className="exp-display trust-hero-title">{title}</h1>
          </HeroReveal>

          <HeroReveal className="trust-hero-sub" delay={0.28} duration={0.55} y={14}>
            <p className="trust-hero-description">{description}</p>
            <p className="trust-hero-updated">
              {pagesLegal.updatedPrefix} {updated}
            </p>
          </HeroReveal>
        </div>
      </section>

      <section className="trust-panel trust-panel-body" aria-label={a11y("documentBodyAria")}>
        <div className="exp-section-inner trust-legal-layout">
          <aside className="trust-legal-toc" aria-label={a11y("tableOfContentsAria")}>
            <p className="trust-legal-toc-label">{a11y("tableOfContentsLabel")}</p>
            <ol className="trust-legal-toc-list">
              {sections.map((section) => (
                <li key={section.id}>
                  <a href={`#${section.id}`} className="trust-legal-toc-link">
                    {section.title.replace(/^\d+\.\s*/, "")}
                  </a>
                </li>
              ))}
            </ol>
          </aside>

          <article className="trust-legal-article">
            {sections.map((section, index) => (
              <ScrollReveal key={section.id} delay={index * 0.03} margin="-40px">
                <section id={section.id} className="trust-legal-section">
                  <h2 className="trust-legal-section-title">{section.title}</h2>
                  {section.paragraphs.map((paragraph) => (
                    <p key={paragraph} className="trust-legal-paragraph">
                      {paragraph}
                    </p>
                  ))}
                  {section.bullets ? (
                    <ul className="trust-legal-list">
                      {section.bullets.map((item) => (
                        <li key={item}>{item}</li>
                      ))}
                    </ul>
                  ) : null}
                </section>
              </ScrollReveal>
            ))}

            <div className="trust-legal-contact">
              <p className="trust-legal-contact-label">{contactLabel}</p>
              <a
                href={`mailto:${supportEmail}?subject=${encodeURIComponent(title)}`}
                className="trust-legal-contact-link"
              >
                {supportEmail}
              </a>
            </div>
          </article>
        </div>
      </section>

      <section className="trust-panel" aria-labelledby="trust-related-heading">
        <div className="exp-section-inner trust-related-inner">
          <ScrollReveal margin="-70px">
            <h2 id="trust-related-heading" className="trust-related-title">
              {pagesLegal.relatedHeading}
            </h2>
            <p className="trust-related-description">{pagesLegal.relatedDescription}</p>
          </ScrollReveal>

          <ul className="trust-related-grid">
            {HUB_LINKS.map((link, index) => {
              if (link.key === documentKey) return null;
              const hubItem = pagesLegal.hub[index];
              if (!hubItem) return null;
              const Icon = link.icon;

              return (
                <li key={link.href}>
                  <ScrollReveal delay={0.05 + index * 0.06} y={12} margin="-40px">
                    <Link href={link.href} className="trust-related-card">
                      <Icon className="size-4 text-muted-foreground" aria-hidden />
                      <div className="min-w-0 flex-1">
                        <p className="trust-related-card-title">{hubItem.label}</p>
                        <p className="trust-related-card-meta">{hubItem.description}</p>
                      </div>
                      <ArrowUpRight className="size-4 shrink-0 text-muted-foreground" aria-hidden />
                    </Link>
                  </ScrollReveal>
                </li>
              );
            })}
            <li>
              <ScrollReveal delay={0.18} y={12} margin="-40px">
                <Link href="/contact" className="trust-related-card">
                  <FileText className="size-4 text-muted-foreground" aria-hidden />
                  <div className="min-w-0 flex-1">
                    <p className="trust-related-card-title">{pagesLegal.relatedContactTitle}</p>
                    <p className="trust-related-card-meta">{pagesLegal.relatedContactMeta}</p>
                  </div>
                  <ArrowUpRight className="size-4 shrink-0 text-muted-foreground" aria-hidden />
                </Link>
              </ScrollReveal>
            </li>
          </ul>
        </div>
      </section>
    </div>
  );
}
