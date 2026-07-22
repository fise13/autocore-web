"use client";

import { type ReactNode } from "react";
import { motion, useReducedMotion } from "motion/react";

import { HeroMotorsTheater } from "@/components/marketing/experience/surfaces/hero-motors-theater";
import { ProductAppSurface } from "@/components/marketing/experience/surfaces/product-app-surface";
import { TrialButton } from "@/components/marketing/experience/ui/trial-button";
import { useProductContent } from "@/components/marketing/product/content/use-product-content";
import { ProductModulesNav } from "@/components/marketing/product/product-modules-nav";
import { ProductWalkSection } from "@/components/marketing/product/product-walk-section";
import { ProductAiImportSurface } from "@/components/marketing/product/surfaces/product-ai-import-surface";
import { ProductDocumentPreview } from "@/components/marketing/product/surfaces/product-document-preview";
import { ProductFinanceSurface } from "@/components/marketing/product/surfaces/product-finance-surface";
import { ProductMobilePhone } from "@/components/marketing/product/surfaces/product-mobile-phone";
import { ProductSaleDemo } from "@/components/marketing/product/surfaces/product-sale-demo";
import { ProductWorkOrderPanel } from "@/components/marketing/product/surfaces/product-work-order-panel";
import { Button } from "@/components/ui/button";
import { Link } from "@/i18n/navigation";

const EASE = [0.16, 1, 0.3, 1] as const;

type FadeProps = {
  children: ReactNode;
  className?: string;
  delay?: number;
  duration?: number;
  y?: number;
};

function FadeUp({ children, className, delay = 0, duration = 0.7, y = 16 }: FadeProps) {
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
  const copy = useProductContent();
  const sections = copy.sections;
  const engine = sections["engine-search"];

  return (
    <div className="product-page product-walk">
      <section className="product-walk-hero" aria-label={copy.hero.title}>
        <div className="product-walk-hero-copy">
          <FadeUp delay={0} duration={0.7} y={14}>
            <h1 className="product-walk-hero-title">{copy.hero.title}</h1>
          </FadeUp>

          <FadeUp delay={0.12} duration={0.65} y={12}>
            <p className="product-walk-hero-sub">{copy.hero.subtitle}</p>
          </FadeUp>
        </div>

        <motion.div
          className="product-walk-hero-app"
          initial={reduced ? false : { opacity: 0, y: 32 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 1.05, delay: 0.32, ease: EASE }}
        >
          <ProductAppSurface compact className="product-walk-app-surface" />
        </motion.div>
      </section>

      <div className="product-walk-layout">
        <aside className="product-walk-aside">
          <ProductModulesNav />
        </aside>

        <div className="product-walk-main">
          <ProductWalkSection
            id={engine.id}
            title={engine.title}
            line={engine.line}
            question={engine.question}
            surfaceClassName="product-walk-surface-tall"
          >
            <div className="product-engine-search">
              <div className="product-engine-prompt" aria-hidden>
                <span>{engine.searchPrompt}</span>
              </div>
              <HeroMotorsTheater
                className="product-walk-theater"
                initialQuery=""
                dense
              />
            </div>
          </ProductWalkSection>

          <ProductWalkSection
            id={sections.sale.id}
            title={sections.sale.title}
            line={sections.sale.line}
            question={sections.sale.question}
            surfaceClassName="product-walk-surface-tall"
          >
            <ProductSaleDemo />
          </ProductWalkSection>

          <ProductWalkSection
            id={sections["work-order"].id}
            title={sections["work-order"].title}
            line={sections["work-order"].line}
            question={sections["work-order"].question}
            surfaceClassName="product-walk-surface-tall"
          >
            <ProductWorkOrderPanel />
          </ProductWalkSection>

          <ProductWalkSection
            id={sections.documents.id}
            title={sections.documents.title}
            line={sections.documents.line}
            question={sections.documents.question}
            surfaceClassName="product-walk-surface-tall"
          >
            <ProductDocumentPreview />
          </ProductWalkSection>

          <ProductWalkSection
            id={sections.finance.id}
            title={sections.finance.title}
            line={sections.finance.line}
            question={sections.finance.question}
            surfaceClassName="product-walk-surface-tall"
          >
            <ProductFinanceSurface />
          </ProductWalkSection>

          <ProductWalkSection
            id={sections.mobile.id}
            title={sections.mobile.title}
            line={sections.mobile.line}
            question={sections.mobile.question}
            surfaceClassName="product-walk-surface-phone"
          >
            <ProductMobilePhone />
          </ProductWalkSection>

          <ProductWalkSection
            id={sections.ai.id}
            title={sections.ai.title}
            line={sections.ai.line}
            question={sections.ai.question}
          >
            <ProductAiImportSurface />
          </ProductWalkSection>
        </div>
      </div>

      <section className="product-walk-cta" aria-labelledby="product-cta-heading">
        <div className="product-walk-cta-inner">
          <h2 id="product-cta-heading" className="product-walk-cta-title">
            <span className="block">{copy.cta.titleLine1}</span>
            <span className="block">{copy.cta.titleLine2}</span>
          </h2>
          <div className="product-walk-cta-actions">
            <TrialButton className="product-walk-cta-primary">{copy.cta.primary}</TrialButton>
            <Button
              variant="outline"
              className="product-walk-cta-secondary"
              render={<Link href="/download" />}
              nativeButton={false}
            >
              {copy.cta.secondary}
            </Button>
          </div>
        </div>
      </section>
    </div>
  );
}
