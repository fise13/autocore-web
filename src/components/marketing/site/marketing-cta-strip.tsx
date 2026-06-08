import Link from "next/link";
import { ArrowRight } from "lucide-react";

import { marketingSiteContent } from "@/components/marketing/content/marketing-site-content";
import { Button } from "@/components/ui/button";
import { marketingRoutes } from "@/lib/marketing-routes";
import { appDemoUrl } from "@/lib/site-urls";

type MarketingCtaStripProps = {
  title?: string;
  description?: string;
};

const defaults = marketingSiteContent.cta;

export function MarketingCtaStrip({
  title = defaults.title,
  description = defaults.description,
}: MarketingCtaStripProps) {
  return (
    <section className="marketing-cta-strip">
      <div className="landing-container marketing-cta-strip-inner">
        <h2 className="marketing-cta-strip-title">{title}</h2>
        <p className="landing-lead mx-auto mt-4 max-w-lg text-center">{description}</p>
        <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
          <Button size="lg" render={<Link href={appDemoUrl()} />}>
            {defaults.primary}
            <ArrowRight className="size-4" data-icon="inline-end" />
          </Button>
          <Button variant="outline" size="lg" render={<Link href={marketingRoutes.modules} />}>
            {defaults.secondary}
          </Button>
        </div>
      </div>
    </section>
  );
}
