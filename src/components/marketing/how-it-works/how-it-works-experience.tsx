"use client";

import { type ReactNode } from "react";
import { motion, useReducedMotion } from "motion/react";
import {
  ArrowUpRight,
  ClipboardList,
  Globe,
  Layers,
  ChartLine,
  Monitor,
  ScanLine,
  Search,
  ShieldCheck,
  Smartphone,
  Wrench,
  CircleCheck,
  type LucideIcon,
} from "lucide-react";

import { useMarketingPages } from "@/components/marketing/content/use-marketing-pages";
import { TrialButton } from "@/components/marketing/experience/ui/trial-button";
import { Link } from "@/i18n/navigation";

const EASE = [0.16, 1, 0.3, 1] as const;

/** Step id → icon. Falls back to the scan glyph if copy adds a step. */
const STEP_ICONS: Record<string, LucideIcon> = {
  intake: ScanLine,
  quote: Search,
  order: ClipboardList,
  floor: Wrench,
  close: CircleCheck,
  cash: ChartLine,
};

const SURFACE_ICONS = [Smartphone, Monitor, Globe] as const;

type RevealProps = {
  children: ReactNode;
  className?: string;
  delay?: number;
  y?: number;
  margin?: string;
};

function HeroReveal({ children, className, delay = 0, y = 18 }: RevealProps) {
  const reduced = useReducedMotion();

  return (
    <motion.div
      className={className}
      initial={reduced ? false : { opacity: 0, y }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.62, delay, ease: EASE }}
    >
      {children}
    </motion.div>
  );
}

function ScrollReveal({
  children,
  className,
  delay = 0,
  y = 14,
  margin = "-60px",
}: RevealProps) {
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

/** The rail segment that ties one step to the next. */
function ChainRail({ index }: { index: number }) {
  return (
    <div className="hiw-step-rail" aria-hidden>
      <span className="hiw-step-index">{String(index + 1).padStart(2, "0")}</span>
      <span className="hiw-step-line" />
    </div>
  );
}

export function HowItWorksExperience() {
  const pages = useMarketingPages();
  const copy = pages.howItWorks;

  return (
    <div className="trust-page hiw-page">
      <section className="trust-panel trust-panel-hero" aria-label={pages.breadcrumbs.howItWorks}>
        <div className="exp-section-inner trust-panel-inner">
          <nav className="trust-breadcrumbs" aria-label={copy.sections.breadcrumbsAria}>
            <Link href="/">AutoCore</Link>
            <span aria-hidden>/</span>
            <span>{pages.breadcrumbs.howItWorks}</span>
          </nav>

          <HeroReveal delay={0} y={20}>
            <h1 className="exp-display trust-hero-title hiw-hero-title">{copy.hero.title}</h1>
          </HeroReveal>

          <HeroReveal className="trust-hero-sub" delay={0.26} y={14}>
            <p className="trust-hero-description hiw-hero-description">{copy.hero.description}</p>
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

      <section className="trust-panel" aria-labelledby="hiw-chain-heading">
        <div className="exp-section-inner trust-section-inner">
          <ScrollReveal margin="-70px">
            <h2 id="hiw-chain-heading" className="trust-section-title">
              {copy.sections.chainTitle}
            </h2>
            <p className="trust-section-description">{copy.sections.chainBody}</p>
          </ScrollReveal>

          <ol className="hiw-chain">
            {copy.chain.map((step, index) => {
              const Icon = STEP_ICONS[step.id] ?? ScanLine;
              return (
                <li key={step.id} className="hiw-step">
                  <ChainRail index={index} />

                  <ScrollReveal className="hiw-step-body-wrap" y={12} margin="-45px">
                    <div className="hiw-step-grid">
                      <div className="hiw-step-action">
                        <p className="hiw-step-meta">
                          <span className="hiw-step-actor">{step.actor}</span>
                          <span className="hiw-step-dot" aria-hidden>
                            ·
                          </span>
                          <span>{step.surface}</span>
                        </p>
                        <h3 className="hiw-step-title">
                          <Icon className="hiw-step-icon size-4" aria-hidden />
                          {step.title}
                        </h3>
                        <p className="hiw-step-text">{step.body}</p>
                        <p className="hiw-step-caption">
                          <span className="hiw-trigger">{step.trigger}</span>
                          {copy.sections.chainActionLabel}
                        </p>
                      </div>

                      <div className="hiw-cascade">
                        <p className="hiw-cascade-label">{copy.sections.chainAutoLabel}</p>
                        <ul className="hiw-cascade-list">
                          {step.cascade.map((line) => (
                            <li key={line} className="hiw-cascade-row">
                              <span className="hiw-cascade-tick" aria-hidden />
                              <span>{line}</span>
                            </li>
                          ))}
                        </ul>
                      </div>
                    </div>
                  </ScrollReveal>
                </li>
              );
            })}
          </ol>
        </div>
      </section>

      <section className="trust-panel" aria-labelledby="hiw-surfaces-heading">
        <div className="exp-section-inner trust-section-inner">
          <ScrollReveal margin="-70px">
            <h2 id="hiw-surfaces-heading" className="trust-section-title">
              {copy.sections.surfacesTitle}
            </h2>
            <p className="trust-section-description">{copy.sections.surfacesBody}</p>
          </ScrollReveal>

          <ul className="hiw-surfaces">
            {copy.surfaces.map((surface, index) => {
              const Icon = SURFACE_ICONS[index] ?? Globe;
              return (
                <li key={surface.name}>
                  <ScrollReveal delay={0.04 + index * 0.05} y={12} margin="-40px">
                    <article className="hiw-surface">
                      <div className="trust-pillar-icon" aria-hidden>
                        <Icon className="size-4" />
                      </div>
                      <h3 className="hiw-surface-name">{surface.name}</h3>
                      <p className="hiw-surface-where">{surface.where}</p>
                      <p className="hiw-surface-detail">{surface.detail}</p>
                    </article>
                  </ScrollReveal>
                </li>
              );
            })}
          </ul>
        </div>
      </section>

      <section className="trust-panel" aria-labelledby="hiw-manual-heading">
        <div className="exp-section-inner trust-section-inner">
          <ScrollReveal margin="-70px">
            <h2 id="hiw-manual-heading" className="trust-section-title">
              {copy.sections.manualTitle}
            </h2>
            <p className="trust-section-description">{copy.sections.manualBody}</p>
          </ScrollReveal>

          <ul className="hiw-manual">
            {copy.manual.map((item, index) => (
              <li key={item.title}>
                <ScrollReveal delay={0.04 + index * 0.05} y={10} margin="-40px">
                  <article className="hiw-manual-item">
                    <h3 className="hiw-manual-title">{item.title}</h3>
                    <p className="hiw-manual-body">{item.body}</p>
                  </article>
                </ScrollReveal>
              </li>
            ))}
          </ul>
        </div>
      </section>

      <section className="trust-panel" aria-labelledby="hiw-rollout-heading">
        <div className="exp-section-inner trust-section-inner">
          <ScrollReveal margin="-70px">
            <h2 id="hiw-rollout-heading" className="trust-section-title">
              {copy.sections.rolloutTitle}
            </h2>
            <p className="trust-section-description">{copy.sections.rolloutBody}</p>
          </ScrollReveal>

          <ol className="hiw-rollout">
            {copy.rollout.map((step, index) => (
              <li key={step.label}>
                <ScrollReveal delay={0.03 + index * 0.05} y={10} margin="-35px">
                  <article className="hiw-rollout-item">
                    <p className="hiw-rollout-label">{step.label}</p>
                    <p className="hiw-rollout-detail">{step.detail}</p>
                  </article>
                </ScrollReveal>
              </li>
            ))}
          </ol>
        </div>
      </section>

      <section className="trust-panel trust-panel-compact" aria-labelledby="hiw-cta-heading">
        <div className="exp-section-inner trust-section-inner">
          <ScrollReveal margin="-50px">
            <div className="hiw-cta">
              <div className="hiw-cta-copy">
                <h2 id="hiw-cta-heading" className="hiw-cta-title">
                  {copy.cta.title}
                </h2>
                <p className="hiw-cta-body">{copy.cta.body}</p>
              </div>
              <div className="hiw-cta-actions">
                <TrialButton className="h-10 px-5 text-sm">{copy.cta.primary}</TrialButton>
                <Link href="/contact" className="hiw-cta-secondary">
                  {copy.cta.secondary}
                  <ArrowUpRight className="size-3.5" aria-hidden />
                </Link>
              </div>
            </div>
          </ScrollReveal>
        </div>
      </section>

      <section className="trust-panel trust-panel-compact" aria-labelledby="hiw-related-heading">
        <div className="exp-section-inner trust-related-inner">
          <ScrollReveal margin="-60px">
            <h2 id="hiw-related-heading" className="trust-related-title">
              {copy.sections.relatedTitle}
            </h2>
          </ScrollReveal>

          <ul className="trust-related-grid">
            <li>
              <Link href="/product" className="trust-related-card">
                <Layers className="size-4 text-muted-foreground" aria-hidden />
                <div className="min-w-0 flex-1">
                  <p className="trust-related-card-title">{copy.sections.relatedProductTitle}</p>
                  <p className="trust-related-card-meta">{copy.sections.relatedProductMeta}</p>
                </div>
              </Link>
            </li>
            <li>
              <Link href="/modules" className="trust-related-card">
                <ClipboardList className="size-4 text-muted-foreground" aria-hidden />
                <div className="min-w-0 flex-1">
                  <p className="trust-related-card-title">{copy.sections.relatedModulesTitle}</p>
                  <p className="trust-related-card-meta">{copy.sections.relatedModulesMeta}</p>
                </div>
              </Link>
            </li>
            <li>
              <Link href="/security" className="trust-related-card">
                <ShieldCheck className="size-4 text-muted-foreground" aria-hidden />
                <div className="min-w-0 flex-1">
                  <p className="trust-related-card-title">{copy.sections.relatedSecurityTitle}</p>
                  <p className="trust-related-card-meta">{copy.sections.relatedSecurityMeta}</p>
                </div>
              </Link>
            </li>
          </ul>
        </div>
      </section>
    </div>
  );
}
