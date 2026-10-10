"use client";

import { type ReactNode } from "react";
import { motion, useReducedMotion } from "motion/react";
import {
  CircleCheck,
  FileText,
  KeyRound,
  Lock,
  ScrollText,
  Shield,
  ShieldCheck,
  Users,
} from "lucide-react";

import { useMarketingPages } from "@/components/marketing/content/use-marketing-pages";
import { Link } from "@/i18n/navigation";
import { cn } from "@/lib/utils";

const EASE = [0.16, 1, 0.3, 1] as const;

const PILLAR_ICONS = [Users, ScrollText, Shield, KeyRound] as const;

const SEVERITY_CLASS = {
  info: "trust-audit-dot-info",
  warn: "trust-audit-dot-warn",
  critical: "trust-audit-dot-critical",
} as const;

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

export function SecurityExperience() {
  const pages = useMarketingPages();
  const copy = pages.security;

  return (
    <div className="trust-page">
      <section className="trust-panel trust-panel-hero" aria-label={pages.breadcrumbs.security}>
        <div className="exp-section-inner trust-panel-inner">
          <nav className="trust-breadcrumbs" aria-label={copy.sections.breadcrumbsAria}>
            <Link href="/">AutoCore</Link>
            <span aria-hidden>/</span>
            <span>{pages.breadcrumbs.security}</span>
          </nav>

          <HeroReveal delay={0} duration={0.68} y={20}>
            <h1 className="exp-display trust-hero-title">{copy.hero.title}</h1>
          </HeroReveal>

          <HeroReveal className="trust-hero-sub" delay={0.28} duration={0.55} y={14}>
            <p className="trust-hero-description">{copy.hero.description}</p>
          </HeroReveal>
        </div>
      </section>

      <section className="trust-panel trust-panel-compact" aria-label={copy.sections.statsAria}>
        <div className="exp-section-inner">
          <ScrollReveal margin="-50px">
            <div className="trust-stats">
              {copy.stats.map((stat) => (
                <div key={stat.label} className="trust-stat">
                  <p className="trust-stat-value">{stat.value}</p>
                  <p className="trust-stat-label">{stat.label}</p>
                </div>
              ))}
            </div>
          </ScrollReveal>
        </div>
      </section>

      <section className="trust-panel" aria-labelledby="security-pillars-heading">
        <div className="exp-section-inner trust-section-inner">
          <ScrollReveal margin="-70px">
            <h2 id="security-pillars-heading" className="trust-section-title">
              {copy.sections.foundationTitle}
            </h2>
            <p className="trust-section-description">{copy.sections.foundationBody}</p>
          </ScrollReveal>

          <ul className="trust-pillar-grid">
            {copy.pillars.map((pillar, index) => {
              const Icon = PILLAR_ICONS[index] ?? Shield;
              return (
                <li key={pillar.title}>
                  <ScrollReveal delay={0.04 + index * 0.05} y={12} margin="-40px">
                    <article className="trust-pillar-card">
                      <div className="trust-pillar-icon" aria-hidden>
                        <Icon className="size-4" />
                      </div>
                      <h3 className="trust-pillar-title">{pillar.title}</h3>
                      <p className="trust-pillar-body">{pillar.body}</p>
                    </article>
                  </ScrollReveal>
                </li>
              );
            })}
          </ul>
        </div>
      </section>

      <section className="trust-panel" aria-labelledby="security-stack-heading">
        <div className="exp-section-inner trust-section-inner">
          <ScrollReveal margin="-70px">
            <h2 id="security-stack-heading" className="trust-section-title">
              {copy.sections.layersTitle}
            </h2>
            <p className="trust-section-description">{copy.sections.layersBody}</p>
          </ScrollReveal>

          <ol className="trust-stack">
            {copy.stack.map((item, index) => (
              <li key={item.layer}>
                <ScrollReveal delay={0.03 + index * 0.04} y={10} margin="-35px">
                  <article className="trust-stack-item">
                    <span className="trust-stack-index" aria-hidden>
                      {index + 1}
                    </span>
                    <div className="min-w-0 flex-1">
                      <h3 className="trust-stack-title">{item.layer}</h3>
                      <p className="trust-stack-body">{item.detail}</p>
                    </div>
                    <ShieldCheck className="size-4 shrink-0 text-muted-foreground/50" aria-hidden />
                  </article>
                </ScrollReveal>
              </li>
            ))}
          </ol>
        </div>
      </section>

      <section className="trust-panel" aria-labelledby="security-audit-heading">
        <div className="exp-section-inner trust-section-inner">
          <ScrollReveal margin="-70px">
            <h2 id="security-audit-heading" className="trust-section-title">
              {copy.sections.auditTitle}
            </h2>
            <p className="trust-section-description">{copy.sections.auditBody}</p>
          </ScrollReveal>

          <ScrollReveal delay={0.06} margin="-50px">
            <div className="trust-audit-log">
              {copy.auditLog.map((entry) => (
                <div key={entry.time + entry.action} className="trust-audit-row">
                  <span
                    className={cn("trust-audit-dot", SEVERITY_CLASS[entry.severity])}
                    aria-hidden
                  />
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="trust-audit-action">{entry.action}</p>
                      <span className="trust-audit-module">{entry.module}</span>
                    </div>
                    <p className="trust-audit-meta">
                      {entry.actor} · {entry.role}
                    </p>
                  </div>
                  <time className="trust-audit-time">{entry.time}</time>
                </div>
              ))}
            </div>
          </ScrollReveal>
        </div>
      </section>

      <section className="trust-panel" aria-labelledby="security-principles-heading">
        <div className="exp-section-inner trust-section-inner">
          <ScrollReveal margin="-70px">
            <h2 id="security-principles-heading" className="trust-section-title">
              {copy.sections.principlesTitle}
            </h2>
          </ScrollReveal>

          <ul className="trust-principle-grid">
            {copy.principles.map((principle, index) => (
              <li key={principle.title}>
                <ScrollReveal delay={0.04 + index * 0.05} y={10} margin="-40px">
                  <article className="trust-principle-card">
                    <div className="trust-principle-icon" aria-hidden>
                      {index === 0 ? <Lock className="size-4" /> : null}
                      {index === 1 ? <ScrollText className="size-4" /> : null}
                      {index === 2 ? <Shield className="size-4" /> : null}
                    </div>
                    <h3 className="trust-principle-title">{principle.title}</h3>
                    <p className="trust-principle-body">{principle.body}</p>
                  </article>
                </ScrollReveal>
              </li>
            ))}
          </ul>
        </div>
      </section>

      <section className="trust-panel trust-panel-compact" aria-labelledby="security-checklist-heading">
        <div className="exp-section-inner trust-section-inner trust-checklist-wrap">
          <ScrollReveal margin="-60px">
            <h2 id="security-checklist-heading" className="trust-section-title trust-section-title-center">
              {copy.sections.checklistTitle}
            </h2>
            <p className="trust-section-description trust-section-description-center">
              {copy.sections.checklistBody}
            </p>
          </ScrollReveal>

          <ScrollReveal delay={0.08} margin="-40px">
            <ul className="trust-checklist">
              {copy.checklist.map((item) => (
                <li key={item}>
                  <CircleCheck className="size-4 shrink-0 text-primary" aria-hidden />
                  <span>{item}</span>
                </li>
              ))}
            </ul>
          </ScrollReveal>
        </div>
      </section>

      <section className="trust-panel" aria-labelledby="trust-related-heading">
        <div className="exp-section-inner trust-related-inner">
          <ScrollReveal margin="-70px">
            <h2 id="trust-related-heading" className="trust-related-title">
              {copy.sections.relatedTitle}
            </h2>
          </ScrollReveal>

          <ul className="trust-related-grid">
            <li>
              <Link href="/legal/privacy" className="trust-related-card">
                <FileText className="size-4 text-muted-foreground" aria-hidden />
                <div className="min-w-0 flex-1">
                  <p className="trust-related-card-title">{copy.sections.relatedPrivacyTitle}</p>
                  <p className="trust-related-card-meta">{copy.sections.relatedPrivacyMeta}</p>
                </div>
              </Link>
            </li>
            <li>
              <Link href="/legal/terms" className="trust-related-card">
                <FileText className="size-4 text-muted-foreground" aria-hidden />
                <div className="min-w-0 flex-1">
                  <p className="trust-related-card-title">{copy.sections.relatedTermsTitle}</p>
                  <p className="trust-related-card-meta">{copy.sections.relatedTermsMeta}</p>
                </div>
              </Link>
            </li>
            <li>
              <Link href="/contact" className="trust-related-card">
                <Shield className="size-4 text-muted-foreground" aria-hidden />
                <div className="min-w-0 flex-1">
                  <p className="trust-related-card-title">{copy.sections.relatedContactTitle}</p>
                  <p className="trust-related-card-meta">{copy.sections.relatedContactMeta}</p>
                </div>
              </Link>
            </li>
          </ul>
        </div>
      </section>
    </div>
  );
}
