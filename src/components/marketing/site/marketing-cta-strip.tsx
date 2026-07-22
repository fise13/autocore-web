"use client";

import NextLink from "next/link";
import { ArrowRight } from "lucide-react";
import { useTranslations } from "next-intl";
import { useRef } from "react";

import { useGsapReveal, useGsapSplitHeading } from "@/components/marketing/motion/use-gsap-reveal";
import { Button } from "@/components/ui/button";
import { Link } from "@/i18n/navigation";
import { appDemoUrl } from "@/lib/site-urls";

type MarketingCtaStripProps = {
  title?: string;
  description?: string;
};

export function MarketingCtaStrip({ title, description }: MarketingCtaStripProps) {
  const t = useTranslations("marketing.common.ctaStrip");
  const ref = useRef<HTMLElement>(null);
  useGsapSplitHeading(ref, "[data-cta-strip-heading]");
  useGsapReveal(ref, "[data-cta-strip-reveal]", { stagger: 0.1, y: 20 });

  return (
    <section ref={ref} className="marketing-cta-strip">
      <div className="landing-container marketing-cta-strip-inner">
        <h2 data-cta-strip-heading className="marketing-cta-strip-title">
          {title ?? t("title")}
        </h2>
        <p className="landing-lead mx-auto mt-4 max-w-lg text-center" data-cta-strip-reveal>
          {description ?? t("description")}
        </p>
        <div className="mt-8 flex flex-wrap items-center justify-center gap-3" data-cta-strip-reveal>
          <Button size="lg" render={<NextLink href={appDemoUrl()} />} nativeButton={false}>
            {t("primary")}
            <ArrowRight className="size-4" data-icon="inline-end" />
          </Button>
          <Button variant="outline" size="lg" render={<Link href="/modules" />} nativeButton={false}>
            {t("secondary")}
          </Button>
        </div>
      </div>
    </section>
  );
}
