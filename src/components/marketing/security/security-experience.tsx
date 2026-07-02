"use client";

import Link from "next/link";
import { type ReactNode } from "react";
import { motion, useReducedMotion } from "motion/react";
import {
  CheckCircle2,
  FileText,
  KeyRound,
  Lock,
  ScrollText,
  Shield,
  ShieldCheck,
  Users,
} from "lucide-react";

import { marketingSiteContent } from "@/components/marketing/content/marketing-site-content";
import { marketingRoutes } from "@/lib/marketing-routes";
import { cn } from "@/lib/utils";

const copy = marketingSiteContent.security;
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
  return (
    <div className="trust-page">
      <section className="trust-panel trust-panel-hero" aria-label="Безопасность">
        <div className="exp-section-inner trust-panel-inner">
          <nav className="trust-breadcrumbs" aria-label="Хлебные крошки">
            <Link href={marketingRoutes.home}>AutoCore</Link>
            <span aria-hidden>/</span>
            <span>Безопасность</span>
          </nav>

          <HeroReveal delay={0} duration={0.68} y={20}>
            <p className="trust-eyebrow">Enterprise-ready</p>
            <h1 className="exp-display trust-hero-title">{copy.hero.title}</h1>
          </HeroReveal>

          <HeroReveal className="trust-hero-sub" delay={0.28} duration={0.55} y={14}>
            <p className="trust-hero-description">{copy.hero.description}</p>
          </HeroReveal>
        </div>
      </section>

      <section className="trust-panel trust-panel-compact" aria-label="Ключевые показатели">
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
              Фундамент, не дополнение
            </h2>
            <p className="trust-section-description">
              Права, аудит и изоляция данных встроены в архитектуру — с первого дня эксплуатации.
            </p>
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
            <p className="trust-eyebrow">Архитектура</p>
            <h2 id="security-stack-heading" className="trust-section-title">
              Защита на каждом слое
            </h2>
            <p className="trust-section-description">
              От входа пользователя до генерации PDF — контроль доступа на каждом этапе.
            </p>
          </ScrollReveal>

          <ol className="trust-stack">
            {copy.stack.map((item, index) => (
              <li key={item.layer}>
                <ScrollReveal delay={0.03 + index * 0.04} y={10} margin="-35px">
                  <article className="trust-stack-item">
                    <span className="trust-stack-index">{String(index + 1).padStart(2, "0")}</span>
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
              Журнал активности
            </h2>
            <p className="trust-section-description">
              Пример записей, которые видит руководитель в Mission Control — кто, что, когда и в каком модуле.
            </p>
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
              Принципы
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
              Контрольный список
            </h2>
            <p className="trust-section-description trust-section-description-center">
              Что проверяем при проектировании каждого модуля AutoCore.
            </p>
          </ScrollReveal>

          <ScrollReveal delay={0.08} margin="-40px">
            <ul className="trust-checklist">
              {copy.checklist.map((item) => (
                <li key={item}>
                  <CheckCircle2 className="size-4 shrink-0 text-primary" aria-hidden />
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
              Документы и контакты
            </h2>
          </ScrollReveal>

          <ul className="trust-related-grid">
            <li>
              <Link href={marketingRoutes.privacy} className="trust-related-card">
                <FileText className="size-4 text-muted-foreground" aria-hidden />
                <div className="min-w-0 flex-1">
                  <p className="trust-related-card-title">Конфиденциальность</p>
                  <p className="trust-related-card-meta">Политика обработки данных</p>
                </div>
              </Link>
            </li>
            <li>
              <Link href={marketingRoutes.terms} className="trust-related-card">
                <FileText className="size-4 text-muted-foreground" aria-hidden />
                <div className="min-w-0 flex-1">
                  <p className="trust-related-card-title">Условия</p>
                  <p className="trust-related-card-meta">Правила использования сервиса</p>
                </div>
              </Link>
            </li>
            <li>
              <Link href={marketingRoutes.contact} className="trust-related-card">
                <Shield className="size-4 text-muted-foreground" aria-hidden />
                <div className="min-w-0 flex-1">
                  <p className="trust-related-card-title">Связаться</p>
                  <p className="trust-related-card-meta">Вопросы по безопасности и доступу</p>
                </div>
              </Link>
            </li>
          </ul>
        </div>
      </section>
    </div>
  );
}
