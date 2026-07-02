"use client";

import { type ReactNode } from "react";
import { motion, useReducedMotion } from "motion/react";

import { marketingSiteContent } from "@/components/marketing/content/marketing-site-content";
import { Button } from "@/components/ui/button";
import { storePendingBillingIntent } from "@/lib/marketing/pending-billing-intent";
import { marketingTrialSignupUrl } from "@/lib/marketing/trial-signup-url";
import { getPlatformContacts } from "@/lib/platform/platform-contacts";

const copy = marketingSiteContent.contact;
const supportEmail = getPlatformContacts().email;
const EASE = [0.16, 1, 0.3, 1] as const;

function contactMailto(subject: string) {
  return `mailto:${supportEmail}?subject=${encodeURIComponent(subject)}`;
}

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
  duration?: number;
  y?: number;
  margin?: string;
};

function ScrollReveal({
  children,
  className,
  delay = 0,
  duration = 0.55,
  y = 16,
  margin = "-60px",
}: ScrollRevealProps) {
  const reduced = useReducedMotion();

  return (
    <motion.div
      className={className}
      initial={reduced ? false : { opacity: 0, y }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin }}
      transition={{ duration, delay, ease: EASE }}
    >
      {children}
    </motion.div>
  );
}

function startTrialSignup() {
  storePendingBillingIntent({ type: "trial" });
  window.location.href = marketingTrialSignupUrl();
}

export function ContactExperience() {
  return (
    <div className="contact-page">
      <section className="contact-panel contact-panel-hero" aria-label="Связаться">
        <div className="exp-section-inner contact-panel-inner">
          <HeroReveal delay={0} duration={0.72} y={22}>
            <h1 className="exp-display contact-hero-title">{copy.hero.title}</h1>
          </HeroReveal>

          <HeroReveal className="contact-hero-sub" delay={0.38} duration={0.58} y={16}>
            <p className="contact-hero-description">{copy.hero.description}</p>
          </HeroReveal>
        </div>
      </section>

      <section className="contact-panel" aria-labelledby="contact-intents-heading">
        <div className="exp-section-inner contact-panel-inner contact-intents-inner">
          <ScrollReveal margin="-80px">
            <h2 id="contact-intents-heading" className="sr-only">
              Выберите тему обращения
            </h2>
          </ScrollReveal>

          <ul className="contact-intent-grid">
            {copy.intents.map((intent, index) => (
              <li key={intent.title}>
                <ScrollReveal delay={0.06 + index * 0.06} y={18} margin="-40px">
                  <a
                    href={contactMailto(intent.mailSubject)}
                    className="contact-intent-card"
                  >
                    <h3 className="exp-display contact-intent-title">{intent.title}</h3>
                    <ul className="contact-intent-topics">
                      {intent.topics.map((topic) => (
                        <li key={topic}>{topic}</li>
                      ))}
                    </ul>
                  </a>
                </ScrollReveal>
              </li>
            ))}
          </ul>
        </div>
      </section>

      <section className="contact-panel contact-panel-methods" aria-labelledby="contact-methods-heading">
        <div className="exp-section-inner contact-panel-inner contact-methods-inner">
          <ScrollReveal margin="-80px">
            <h2 id="contact-methods-heading" className="sr-only">
              Способы связи
            </h2>
          </ScrollReveal>

          <dl className="contact-methods-list">
            <ScrollReveal delay={0.04} margin="-50px">
              <div className="contact-methods-row">
                <dt>{copy.methods.emailLabel}</dt>
                <dd>
                  <a href={`mailto:${copy.methods.email}`} className="contact-methods-link">
                    {copy.methods.email}
                  </a>
                </dd>
              </div>
            </ScrollReveal>

            <ScrollReveal delay={0.1} margin="-50px">
              <div className="contact-methods-row">
                <dt>{copy.methods.responseLabel}</dt>
                <dd>{copy.methods.response}</dd>
              </div>
            </ScrollReveal>

            <ScrollReveal delay={0.16} margin="-50px">
              <div className="contact-methods-row">
                <dt>{copy.methods.languagesLabel}</dt>
                <dd>{copy.methods.languages.join(", ")}</dd>
              </div>
            </ScrollReveal>
          </dl>
        </div>
      </section>

      <section className="contact-panel contact-panel-close" aria-labelledby="contact-close-heading">
        <div className="exp-section-inner contact-panel-inner contact-close-inner">
          <ScrollReveal margin="-80px" y={14}>
            <h2 id="contact-close-heading" className="exp-display contact-close-title">
              {copy.closing.line}
            </h2>
          </ScrollReveal>

          <ScrollReveal delay={0.08} y={12} margin="-50px">
            <p className="contact-close-subline">{copy.closing.subline}</p>
          </ScrollReveal>

          <ScrollReveal className="contact-close-cta" delay={0.14} y={10} margin="-50px">
            <Button size="lg" className="h-10 min-w-[11rem] px-5 text-sm" onClick={startTrialSignup}>
              {copy.closing.button}
            </Button>
          </ScrollReveal>
        </div>
      </section>
    </div>
  );
}
