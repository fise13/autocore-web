"use client";

import Link from "next/link";
import {
  ArrowRight,
  FileText,
  Globe,
  Monitor,
  Radar,
  RefreshCw,
  Smartphone,
  Workflow,
} from "lucide-react";
import { useRef } from "react";

import { marketingSiteContent } from "@/components/marketing/content/marketing-site-content";
import { MarketingFaq } from "@/components/marketing/site/marketing-faq";
import { MarketingSection } from "@/components/marketing/site/marketing-section";
import { FeatureCard } from "@/components/marketing/site/feature-card";
import { ProductPreviewFrame } from "@/components/marketing/site/product-preview-frame";
import {
  useGsapReveal,
  useGsapStaggerChildren,
} from "@/components/marketing/motion/use-gsap-reveal";
import { marketingRoutes } from "@/lib/marketing-routes";
import { appDemoUrl } from "@/lib/site-urls";
import { Button } from "@/components/ui/button";

const copy = marketingSiteContent.product;
const faq = marketingSiteContent.faq;

const PILLAR_ICONS = [Radar, Workflow, RefreshCw, FileText] as const;
const PILLAR_TONES = ["blue", "green", "amber", "violet"] as const;
const PLATFORM_ICONS = [Globe, Monitor, Smartphone] as const;

export function ProductPageContent() {
  const ref = useRef<HTMLDivElement>(null);
  useGsapReveal(ref, "[data-product-reveal]");
  useGsapStaggerChildren(ref, ".marketing-timeline", ".marketing-timeline-step", { stagger: 0.12, y: 24 });
  useGsapStaggerChildren(ref, ".marketing-persona-grid", ".marketing-persona-card", { stagger: 0.1, y: 22 });
  useGsapStaggerChildren(ref, ".marketing-platform-grid", ".marketing-platform-card", { stagger: 0.1, y: 22 });

  return (
    <div ref={ref} className="marketing-product-page">
      <section className="marketing-product-hero" data-product-reveal>
        <div className="marketing-product-hero-copy">
          <p className="landing-eyebrow">Mission Control · Склад · Наряды · Бухгалтерия</p>
          <p className="marketing-product-hero-lead">
            То, что справа — реальный интерфейс после входа. Метрики, модули и журнал активности обновляются
            в realtime, как в продукте.
          </p>
          <div className="flex flex-wrap gap-3">
            <Button size="lg" render={<Link href={appDemoUrl()} />} nativeButton={false}>
              Попробовать демо
              <ArrowRight className="size-4" data-icon="inline-end" />
            </Button>
            <Button variant="outline" size="lg" render={<Link href={marketingRoutes.modules} />} nativeButton={false}>
              Каталог модулей
            </Button>
          </div>
        </div>
        <div className="marketing-product-hero-preview">
          <ProductPreviewFrame />
        </div>
      </section>

      <MarketingSection title="Что входит в AutoCore" description="Четыре опоры одной операционной системы — каждая ведёт в нужный раздел." className="mt-20">
        <div className="marketing-bento-grid" data-product-reveal>
          {copy.pillars.map((pillar, i) => (
            <FeatureCard
              key={pillar.title}
              icon={PILLAR_ICONS[i] ?? Radar}
              tone={PILLAR_TONES[i] ?? "blue"}
              title={pillar.title}
              description={pillar.body}
              href={pillar.href}
              layout={i === 0 ? "vertical" : "horizontal"}
              className={i === 0 ? "marketing-bento-span-2" : undefined}
            />
          ))}
        </div>
      </MarketingSection>

      <MarketingSection
        eyebrow="Процесс"
        title={copy.workflow.title}
        description={copy.workflow.description}
        className="mt-20"
      >
        <div className="marketing-timeline">
          {copy.workflow.steps.map((step, i) => (
            <article key={step.label} className="marketing-timeline-step">
              <div className="marketing-timeline-marker">
                <span>{String(i + 1).padStart(2, "0")}</span>
              </div>
              <div className="marketing-timeline-body">
                <h3 className="font-semibold">{step.label}</h3>
                <p className="mt-1 text-sm text-muted-foreground">{step.detail}</p>
              </div>
            </article>
          ))}
        </div>
      </MarketingSection>

      <MarketingSection
        id="for-whom"
        title={copy.audience.title}
        description={copy.audience.description}
        className="mt-20 scroll-mt-28"
      >
        <div className="marketing-persona-grid">
          {copy.audience.personas.map((persona) => (
            <article key={persona.title} className="marketing-persona-card">
              <h3 className="text-base font-semibold">{persona.title}</h3>
              <div className="marketing-persona-block">
                <p className="marketing-persona-label">Боль</p>
                <p className="text-sm leading-relaxed text-muted-foreground">{persona.pain}</p>
              </div>
              <div className="marketing-persona-block is-solution">
                <p className="marketing-persona-label">Решение</p>
                <p className="text-sm leading-relaxed">{persona.promise}</p>
              </div>
            </article>
          ))}
        </div>
      </MarketingSection>

      <MarketingSection title={copy.platforms.title} description={copy.platforms.description} className="mt-20">
        <div className="marketing-platform-grid">
          {copy.platforms.items.map((item, i) => {
            const Icon = PLATFORM_ICONS[i] ?? Globe;
            return (
              <article key={item.name} className="marketing-platform-card">
                <span className="marketing-platform-icon" aria-hidden>
                  <Icon className="size-5" strokeWidth={1.75} />
                </span>
                <h3 className="font-semibold">{item.name}</h3>
                <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{item.detail}</p>
              </article>
            );
          })}
        </div>
      </MarketingSection>

      <MarketingSection title={faq.title} description={faq.description} className="mt-20">
        <MarketingFaq items={faq.items.slice(0, 4)} />
        <p className="mt-6 text-center text-sm text-muted-foreground">
          <Link href={marketingRoutes.pricing} className="font-medium text-primary hover:underline">
            Тарифы
          </Link>
          {" · "}
          <Link href={marketingRoutes.contact} className="font-medium text-primary hover:underline">
            Связаться
          </Link>
        </p>
      </MarketingSection>
    </div>
  );
}
