"use client";

import Link from "next/link";
import { useRef } from "react";
import {
  CheckCircle2,
  KeyRound,
  Lock,
  ScrollText,
  Server,
  Shield,
  ShieldCheck,
  Users,
} from "lucide-react";

import { marketingSiteContent } from "@/components/marketing/content/marketing-site-content";
import { FeatureCard } from "@/components/marketing/site/feature-card";
import { MarketingSection } from "@/components/marketing/site/marketing-section";
import { useGsapReveal } from "@/components/marketing/motion/use-gsap-reveal";
import { marketingRoutes } from "@/lib/marketing-routes";
import { cn } from "@/lib/utils";

const copy = marketingSiteContent.security;
const ICONS = [Users, ScrollText, Shield, KeyRound] as const;
const TONES = ["blue", "violet", "green", "amber"] as const;

const SEVERITY_CLASS = {
  info: "security-audit-dot-info",
  warn: "security-audit-dot-warn",
  critical: "security-audit-dot-critical",
} as const;

export function SecurityPageContent() {
  const ref = useRef<HTMLDivElement>(null);
  useGsapReveal(ref, "[data-security-reveal]");

  return (
    <div ref={ref} className="security-page">
      <div className="security-hero-band" data-security-reveal>
        <div className="security-hero-band-inner">
          <div className="security-hero-icon" aria-hidden>
            <ShieldCheck className="size-7" />
          </div>
          <p className="security-hero-band-text">
            Enterprise-ready архитектура для автобизнеса: права, аудит и изоляция данных — из коробки.
          </p>
        </div>
      </div>

      <div className="security-stats" data-security-reveal>
        {copy.stats.map((stat) => (
          <div key={stat.label} className="security-stat">
            <p className="security-stat-value">{stat.value}</p>
            <p className="security-stat-label">{stat.label}</p>
          </div>
        ))}
      </div>

      <div className="grid gap-4 sm:grid-cols-2" data-security-reveal>
        {copy.pillars.map((item, index) => (
          <FeatureCard
            key={item.title}
            icon={ICONS[index] ?? Shield}
            tone={TONES[index] ?? "blue"}
            title={item.title}
            description={item.body}
          />
        ))}
      </div>

      <MarketingSection
        eyebrow="Архитектура"
        title="Защита на каждом слое"
        description="От входа пользователя до генерации PDF — контроль доступа встроен в продукт, а не добавлен поверх."
        className="mt-20"
      >
        <div className="security-stack">
          {copy.stack.map((item, index) => (
            <article key={item.layer} className="security-stack-item" data-security-reveal>
              <div className="security-stack-index">{String(index + 1).padStart(2, "0")}</div>
              <div>
                <h3 className="font-semibold">{item.layer}</h3>
                <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{item.detail}</p>
              </div>
              <Server className="security-stack-icon size-5 text-muted-foreground/40" aria-hidden />
            </article>
          ))}
        </div>
      </MarketingSection>

      <MarketingSection title="Принципы безопасности" className="mt-20">
        <div className="grid gap-4 md:grid-cols-3">
          {copy.principles.map((principle, index) => (
            <article key={principle.title} className="security-principle-card" data-security-reveal>
              <div className="security-principle-icon" aria-hidden>
                {index === 0 ? <Lock className="size-5" /> : null}
                {index === 1 ? <ScrollText className="size-5" /> : null}
                {index === 2 ? <Shield className="size-5" /> : null}
              </div>
              <h3 className="font-semibold">{principle.title}</h3>
              <p className="mt-3 text-sm leading-relaxed text-muted-foreground">{principle.body}</p>
            </article>
          ))}
        </div>
      </MarketingSection>

      <MarketingSection
        title="Журнал активности"
        description="Пример того, что видит руководитель в Mission Control — каждое действие с контекстом, модулем и временем."
        className="mt-20"
      >
        <div className="security-audit-log" data-security-reveal>
          {copy.auditLog.map((entry) => (
            <div key={entry.time + entry.action} className="security-audit-row">
              <span className={cn("security-audit-dot", SEVERITY_CLASS[entry.severity])} aria-hidden />
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <p className="text-sm font-medium">{entry.action}</p>
                  <span className="security-audit-module">{entry.module}</span>
                </div>
                <p className="mt-1 text-xs text-muted-foreground">
                  {entry.actor} · {entry.role}
                </p>
              </div>
              <time className="security-audit-time">{entry.time}</time>
            </div>
          ))}
        </div>
      </MarketingSection>

      <MarketingSection
        title="Контрольный список"
        description="Что проверяем при проектировании каждого модуля AutoCore."
        className="mt-20"
        centered
      >
        <ul className="security-checklist" data-security-reveal>
          {copy.checklist.map((item) => (
            <li key={item}>
              <CheckCircle2 className="size-4 shrink-0 text-emerald-500" aria-hidden />
              <span>{item}</span>
            </li>
          ))}
        </ul>
      </MarketingSection>

      <p className="mt-12 text-center text-sm text-muted-foreground" data-security-reveal>
        Подробнее о ролях — в{" "}
        <Link href={`${marketingRoutes.modules}#employees`} className="font-medium text-primary hover:underline">
          модуле «Команда»
        </Link>
        . Вопросы — на{" "}
        <Link href={marketingRoutes.contact} className="font-medium text-primary hover:underline">
          странице контактов
        </Link>
        .
      </p>
    </div>
  );
}
