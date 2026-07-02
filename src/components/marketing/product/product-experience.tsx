"use client";

import Link from "next/link";
import { type ReactNode } from "react";
import { motion, useReducedMotion } from "motion/react";

import { productContent } from "@/components/marketing/product/content/product-content";
import { AiImportMock } from "@/components/marketing/experience/mocks/ai-import-mock";
import { AnalyticsMock } from "@/components/marketing/experience/mocks/analytics-mock";
import { CtaVisualBackdrop } from "@/components/marketing/experience/mocks/cta-visual-backdrop";
import { DocumentsMock } from "@/components/marketing/experience/mocks/documents-mock";
import { InventoryMock } from "@/components/marketing/experience/mocks/inventory-mock";
import { MissionControlMock } from "@/components/marketing/experience/mocks/mission-control-mock";
import { PlatformSyncExperience } from "@/components/marketing/experience/mocks/platform-sync-experience";
import { RepairTimelineMock } from "@/components/marketing/experience/mocks/repair-timeline-mock";
import { VehicleCardMock } from "@/components/marketing/experience/mocks/vehicle-card-mock";
import { WorkOrderMock } from "@/components/marketing/experience/mocks/work-order-mock";
import { ProductSecuritySlice } from "@/components/marketing/product/product-security-slice";
import { ProductStorySection } from "@/components/marketing/product/product-story-section";
import { ProductWorkdayScroll } from "@/components/marketing/product/product-workday-scroll";
import { Button } from "@/components/ui/button";
import { appDemoUrl } from "@/lib/site-urls";

const copy = productContent;
const EASE = [0.16, 1, 0.3, 1] as const;

function section(id: (typeof copy.sections)[number]["id"]) {
  return copy.sections.find((item) => item.id === id)!;
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

export function ProductExperience() {
  const reduced = useReducedMotion();
  const missionControl = section("mission-control");
  const vehicleCard = section("vehicle-card");
  const workOrders = section("work-orders");
  const inventory = section("inventory");
  const documents = section("documents");
  const repairTimeline = section("repair-timeline");
  const platform = section("platform");
  const aiImport = section("ai-import");
  const analytics = section("analytics");
  const security = section("security");

  return (
    <div className="product-page">
      <section className="product-hero" aria-label="Продукт">
        <div className="exp-section-inner product-hero-inner">
          <div className="product-hero-copy">
            <HeroReveal delay={0} duration={0.72} y={22}>
              <p className="product-hero-kicker">AutoCore</p>
            </HeroReveal>

            <HeroReveal delay={0.12} duration={0.72} y={22}>
              <h1 className="exp-display product-hero-title">{copy.hero.title}</h1>
            </HeroReveal>

            <HeroReveal className="product-hero-description" delay={0.38} duration={0.58} y={16}>
              <p>{copy.hero.description}</p>
            </HeroReveal>

            <HeroReveal delay={0.72} duration={0.48} y={14}>
              <div className="flex flex-wrap gap-3">
                <Button size="lg" render={<Link href={appDemoUrl()} />} nativeButton={false}>
                  {copy.hero.ctaPrimary}
                </Button>
                <Button
                  size="lg"
                  variant="outline"
                  render={<Link href={copy.hero.ctaSecondaryHref} />}
                  nativeButton={false}
                >
                  {copy.hero.ctaSecondary}
                </Button>
              </div>
            </HeroReveal>
          </div>

          <HeroReveal className="product-hero-visual" delay={1.02} duration={0.82} y={28}>
            <div className="exp-mock-shelf p-3 sm:p-4">
              <MissionControlMock className="w-full" layout="hero" />
            </div>
          </HeroReveal>
        </div>
      </section>

      <ProductStorySection
        id="mission-control"
        title={missionControl.title}
        narrative={missionControl.narrative}
        workflow={missionControl.workflow}
        intervalMs={missionControl.intervalMs}
      >
        <MissionControlMock className="w-full" layout="full" />
      </ProductStorySection>

      <ProductWorkdayScroll />

      <ProductStorySection
        id="vehicle-card"
        title={vehicleCard.title}
        narrative={vehicleCard.narrative}
        workflow={vehicleCard.workflow}
        intervalMs={vehicleCard.intervalMs}
        reverse
      >
        <VehicleCardMock className="w-full" />
      </ProductStorySection>

      <ProductStorySection
        id="work-orders"
        title={workOrders.title}
        narrative={workOrders.narrative}
        workflow={workOrders.workflow}
        intervalMs={workOrders.intervalMs}
      >
        <WorkOrderMock className="w-full" />
      </ProductStorySection>

      <ProductStorySection
        id="inventory"
        title={inventory.title}
        narrative={inventory.narrative}
        workflow={inventory.workflow}
        intervalMs={inventory.intervalMs}
        reverse
      >
        <InventoryMock className="w-full" />
      </ProductStorySection>

      <ProductStorySection
        id="documents"
        title={documents.title}
        narrative={documents.narrative}
        workflow={documents.workflow}
        intervalMs={documents.intervalMs}
      >
        <DocumentsMock className="w-full" />
      </ProductStorySection>

      <ProductStorySection
        id="repair-timeline"
        title={repairTimeline.title}
        narrative={repairTimeline.narrative}
        workflow={repairTimeline.workflow}
        intervalMs={repairTimeline.intervalMs}
        reverse
      >
        <RepairTimelineMock className="w-full" />
      </ProductStorySection>

      <ProductStorySection
        id="platform"
        title={platform.title}
        narrative={platform.narrative}
        workflow={platform.workflow}
        intervalMs={platform.intervalMs}
        wideMock
      >
        <PlatformSyncExperience hideHeader />
      </ProductStorySection>

      <ProductStorySection
        id="ai-import"
        title={aiImport.title}
        narrative={aiImport.narrative}
        workflow={aiImport.workflow}
        intervalMs={aiImport.intervalMs}
        reverse
      >
        <AiImportMock className="w-full" />
      </ProductStorySection>

      <ProductStorySection
        id="analytics"
        title={analytics.title}
        narrative={analytics.narrative}
        workflow={analytics.workflow}
        intervalMs={analytics.intervalMs}
      >
        <AnalyticsMock className="w-full" />
      </ProductStorySection>

      <ProductStorySection
        id="security"
        title={security.title}
        narrative={security.narrative}
        workflow={security.workflow}
        intervalMs={security.intervalMs}
        reverse
      >
        <ProductSecuritySlice />
      </ProductStorySection>

      <section className="product-cta" aria-labelledby="product-cta-heading">
        <CtaVisualBackdrop className="absolute inset-0" />

        <div className="exp-section-inner product-cta-inner">
          <motion.h2
            id="product-cta-heading"
            className="exp-display product-cta-title"
            initial={reduced ? false : { opacity: 0, y: 14 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: "-80px" }}
            transition={{ duration: 0.55, ease: EASE }}
          >
            <span className="block">{copy.cta.titleLine1}</span>
            <span className="mt-2 block text-muted-foreground">{copy.cta.titleLine2}</span>
          </motion.h2>

          <motion.p
            className="product-cta-description"
            initial={reduced ? false : { opacity: 0, y: 10 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: "-60px" }}
            transition={{ duration: 0.45, delay: 0.06, ease: EASE }}
          >
            {copy.cta.description}
          </motion.p>

          <motion.div
            className="product-cta-actions"
            initial={reduced ? false : { opacity: 0, y: 10 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: "-50px" }}
            transition={{ duration: 0.45, delay: 0.12, ease: EASE }}
          >
            <Button size="lg" render={<Link href={appDemoUrl()} />} nativeButton={false}>
              {copy.cta.primary}
            </Button>
            <Button
              size="lg"
              variant="ghost"
              className="font-normal text-muted-foreground hover:text-foreground"
              render={<Link href={copy.cta.secondaryHref} />}
              nativeButton={false}
            >
              {copy.cta.secondary}
            </Button>
          </motion.div>

          <motion.p
            className="product-cta-trust"
            initial={reduced ? false : { opacity: 0 }}
            whileInView={{ opacity: 1 }}
            viewport={{ once: true }}
            transition={{ duration: 0.4, delay: 0.18, ease: EASE }}
          >
            {copy.cta.trust.join(" · ")}
          </motion.p>
        </div>
      </section>
    </div>
  );
}
