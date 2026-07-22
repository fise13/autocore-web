"use client";

import { useTranslations } from "next-intl";

type FaqItem = { q: string; a: string };
type ChaosItem = { time: string; text: string };
type SceneItem = {
  id: string;
  tab: string;
  title: string;
  before: string;
  after: string;
};
type GoLiveStep = { label: string; detail: string };
type TrustPillar = { title: string; body: string };
type WorkflowStep = { label: string; detail: string };
type MessageWorkflow = { id: string; title: string; steps: WorkflowStep[] };

/** Playback timing isn't translatable copy — it stays local, keyed by workflow id. */
const WORKFLOW_TIMING: Record<string, { intervalMs: number; initialIndex: number }> = {
  order: { intervalMs: 2200, initialIndex: 0 },
  vin: { intervalMs: 2400, initialIndex: 1 },
  photo: { intervalMs: 2600, initialIndex: 2 },
};

/** Demo numbers for the ROI calculator — not UI copy, kept local. */
const ROI_DEFAULTS = { minutes: 45, rate: 5000, lost: 80000 };

/**
 * Locale-aware landing page copy. Mirrors the historical `landingContent` shape so
 * section components only need to swap the import for this hook.
 */
export function useLandingContent() {
  const t = useTranslations("marketing.landing");

  return {
    hero: {
      ariaLabel: t("hero.ariaLabel"),
      title: t("hero.title"),
      subtitle: t("hero.subtitle"),
      ctaPrimary: t("hero.ctaPrimary"),
      ctaSecondary: t("hero.ctaSecondary"),
      ctaSecondaryHref: "#operating-loop",
      trust: t("hero.trust"),
      visualCaption: t("hero.visualCaption"),
    },
    chaos: {
      eyebrow: t("chaos.eyebrow"),
      title: t("chaos.title"),
      subtitle: t("chaos.subtitle"),
      items: t.raw("chaos.items") as ChaosItem[],
      cta: t("chaos.cta"),
      ctaHref: "#operating-loop",
    },
    outcome: {
      title: t("outcome.title"),
      subtitle: t("outcome.subtitle"),
      cta: t("outcome.cta"),
      ctaHref: "#operating-loop",
    },
    loop: {
      id: "operating-loop",
      eyebrow: t("loop.eyebrow"),
      title: t("loop.title"),
      subtitle: t("loop.subtitle"),
      sell: t("loop.sell"),
      replay: t("loop.replay"),
      closeDocument: t("loop.closeDocument"),
      cascade: t.raw("loop.cascade") as string[],
    },
    scenes: {
      title: t("scenes.title"),
      subtitle: t("scenes.subtitle"),
      cta: t("scenes.cta"),
      beforeLabel: t("scenes.beforeLabel"),
      afterLabel: t("scenes.afterLabel"),
      items: t.raw("scenes.items") as SceneItem[],
      devices: {
        title: t("scenes.devices.title"),
        subtitle: t("scenes.devices.subtitle"),
      },
    },
    goLive: {
      title: t("goLive.title"),
      subtitle: t("goLive.subtitle"),
      steps: t.raw("goLive.steps") as GoLiveStep[],
      primary: t("goLive.primary"),
      secondary: t("goLive.secondary"),
    },
    pricing: {
      title: t("pricing.title"),
      price: t("pricing.price"),
      period: t("pricing.period"),
      note: t("pricing.note"),
      included: t.raw("pricing.included") as string[],
      risk: t("pricing.risk"),
      trial: t("pricing.trial"),
      buy: t("pricing.buy"),
      buyModal: {
        title: t("pricing.buyModal.title"),
        body: t("pricing.buyModal.body"),
        email: t("pricing.buyModal.email"),
        close: t("pricing.buyModal.close"),
      },
    },
    roi: {
      title: t("roi.title"),
      subtitle: t("roi.subtitle"),
      minutesLabel: t("roi.minutesLabel"),
      rateLabel: t("roi.rateLabel"),
      lostLabel: t("roi.lostLabel"),
      resultLabel: t("roi.resultLabel"),
      vsLabel: t("roi.vsLabel"),
      disclaimer: t("roi.disclaimer"),
      cta: t("roi.cta"),
      minutesUnit: t("roi.minutesUnit"),
      perMonth: t("roi.perMonth"),
      defaults: ROI_DEFAULTS,
    },
    trust: {
      title: t("trust.title"),
      subtitle: t("trust.subtitle"),
      pillars: t.raw("trust.pillars") as TrustPillar[],
      link: t("trust.link"),
      linkHref: "/security" as const,
    },
    faq: {
      title: t("faq.title"),
      description: t("faq.description"),
      items: t.raw("faq.items") as FaqItem[],
      ctaPrimary: t("faq.ctaPrimary"),
      ctaBuy: t("faq.ctaBuy"),
    },
    cta: {
      titleLine1: t("cta.titleLine1"),
      titleLine2: t("cta.titleLine2"),
      primary: t("cta.primary"),
      buy: t("cta.buy"),
    },
    philosophy: {
      title: t("philosophy.title"),
      description: t("philosophy.description"),
      before: t.raw("philosophy.before") as string[],
      after: t.raw("philosophy.after") as string[],
      conclusion: t("philosophy.conclusion"),
      workflows: (t.raw("philosophy.workflows") as MessageWorkflow[]).map((workflow) => ({
        ...workflow,
        ...(WORKFLOW_TIMING[workflow.id] ?? { intervalMs: 2400, initialIndex: 0 }),
      })),
    },
    showcase: {
      title: t("showcase.title"),
      description: t("showcase.description"),
      scenes: t.raw("showcase.scenes") as Array<{ id: string; label: string }>,
    },
    platform: {
      title: t("platform.title"),
      description: t("platform.description"),
    },
  };
}

export type LandingContent = ReturnType<typeof useLandingContent>;
