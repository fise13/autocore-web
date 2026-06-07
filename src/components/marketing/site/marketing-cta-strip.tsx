import Link from "next/link";
import { ArrowRight } from "lucide-react";

import { Button } from "@/components/ui/button";
import { marketingRoutes } from "@/lib/marketing-routes";
import { appLoginUrl } from "@/lib/site-urls";

type MarketingCtaStripProps = {
  title?: string;
  description?: string;
};

export function MarketingCtaStrip({
  title = "Готовы убрать хаос из Excel и чатов?",
  description = "Начните бесплатно — склад, наряды и Mission Control в одной системе для автобизнеса.",
}: MarketingCtaStripProps) {
  return (
    <section className="border-t border-border bg-muted/20">
      <div className="mx-auto flex max-w-7xl flex-col items-center gap-6 px-5 py-14 text-center md:px-8 md:py-16">
        <div className="max-w-2xl space-y-3">
          <h2 className="text-2xl font-semibold tracking-tight md:text-3xl">{title}</h2>
          <p className="text-muted-foreground">{description}</p>
        </div>
        <div className="flex flex-wrap items-center justify-center gap-3">
          <Button size="lg" render={<Link href={appLoginUrl()} />}>
            Начать бесплатно
            <ArrowRight className="size-4" data-icon="inline-end" />
          </Button>
          <Button variant="outline" size="lg" render={<Link href={marketingRoutes.modules} />}>
            Смотреть модули
          </Button>
          <Button variant="ghost" size="lg" render={<Link href={marketingRoutes.contact} />}>
            Связаться с нами
          </Button>
        </div>
      </div>
    </section>
  );
}
