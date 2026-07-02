"use client";

import Link from "next/link";
import { type ReactNode } from "react";
import { motion, useReducedMotion } from "motion/react";
import { ArrowUpRight, FileText, Shield } from "lucide-react";

import {
  legalDocuments,
  type LegalDocumentKey,
} from "@/components/marketing/content/legal-content";
import { marketingRoutes } from "@/lib/marketing-routes";
import { getPlatformContacts } from "@/lib/platform/platform-contacts";

const EASE = [0.16, 1, 0.3, 1] as const;
const supportEmail = getPlatformContacts().email;

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

const RELATED_LINKS = [
  {
    key: "security",
    href: marketingRoutes.security,
    label: "Безопасность",
    description: "RBAC, аудит и изоляция данных компаний",
    icon: Shield,
  },
  {
    key: "privacy",
    href: marketingRoutes.privacy,
    label: "Конфиденциальность",
    description: "Обработка персональных и операционных данных",
    icon: FileText,
  },
  {
    key: "terms",
    href: marketingRoutes.terms,
    label: "Условия",
    description: "Правила использования сервиса AutoCore",
    icon: FileText,
  },
] as const;

export function LegalExperience({ documentKey }: LegalExperienceProps) {
  const doc = legalDocuments[documentKey];

  return (
    <div className="trust-page">
      <section className="trust-panel trust-panel-hero" aria-label={doc.title}>
        <div className="exp-section-inner trust-panel-inner">
          <nav className="trust-breadcrumbs" aria-label="Хлебные крошки">
            <Link href={marketingRoutes.home}>AutoCore</Link>
            <span aria-hidden>/</span>
            <span>{doc.breadcrumb}</span>
          </nav>

          <HeroReveal delay={0} duration={0.68} y={20}>
            <h1 className="exp-display trust-hero-title">{doc.title}</h1>
          </HeroReveal>

          <HeroReveal className="trust-hero-sub" delay={0.28} duration={0.55} y={14}>
            <p className="trust-hero-description">{doc.description}</p>
            <p className="trust-hero-updated">Обновлено: {doc.updated}</p>
          </HeroReveal>
        </div>
      </section>

      <section className="trust-panel trust-panel-body" aria-label="Содержание документа">
        <div className="exp-section-inner trust-legal-layout">
          <aside className="trust-legal-toc" aria-label="Оглавление">
            <p className="trust-legal-toc-label">Содержание</p>
            <ol className="trust-legal-toc-list">
              {doc.sections.map((section) => (
                <li key={section.id}>
                  <a href={`#${section.id}`} className="trust-legal-toc-link">
                    {section.title.replace(/^\d+\.\s*/, "")}
                  </a>
                </li>
              ))}
            </ol>
          </aside>

          <article className="trust-legal-article">
            {doc.sections.map((section, index) => (
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
              <p className="trust-legal-contact-label">Вопросы по документу</p>
              <a
                href={`mailto:${supportEmail}?subject=${encodeURIComponent(doc.title)}`}
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
              Доверие и прозрачность
            </h2>
            <p className="trust-related-description">
              Юридические документы, безопасность и контакты — в одном разделе.
            </p>
          </ScrollReveal>

          <ul className="trust-related-grid">
            {RELATED_LINKS.filter((link) => link.key !== documentKey).map((link, index) => {
              const Icon = link.icon;

              return (
                <li key={link.href}>
                  <ScrollReveal delay={0.05 + index * 0.06} y={12} margin="-40px">
                    <Link href={link.href} className="trust-related-card">
                      <Icon className="size-4 text-muted-foreground" aria-hidden />
                      <div className="min-w-0 flex-1">
                        <p className="trust-related-card-title">{link.label}</p>
                        <p className="trust-related-card-meta">{link.description}</p>
                      </div>
                      <ArrowUpRight className="size-4 shrink-0 text-muted-foreground" aria-hidden />
                    </Link>
                  </ScrollReveal>
                </li>
              );
            })}
            <li>
              <ScrollReveal delay={0.18} y={12} margin="-40px">
                <Link href={marketingRoutes.contact} className="trust-related-card">
                  <FileText className="size-4 text-muted-foreground" aria-hidden />
                  <div className="min-w-0 flex-1">
                    <p className="trust-related-card-title">Связаться</p>
                    <p className="trust-related-card-meta">Поддержка и юридические вопросы</p>
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
