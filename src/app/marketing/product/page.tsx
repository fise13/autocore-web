import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight, Monitor, Radar, RefreshCw, Smartphone, Workflow, Globe } from "lucide-react";

import { landingPageContent } from "@/components/marketing/content/landing-page-content";
import { FeatureCard } from "@/components/marketing/site/feature-card";
import { MarketingSubpage } from "@/components/marketing/site/marketing-subpage";
import { ProductPreviewFrame } from "@/components/marketing/site/product-preview-frame";
import { marketingRoutes } from "@/lib/marketing-routes";
import { appLoginUrl } from "@/lib/site-urls";
import { Button } from "@/components/ui/button";

const showcase = landingPageContent.showcase;
const platforms = landingPageContent.platforms;
const audience = landingPageContent.audience;

export const metadata: Metadata = {
  title: "Обзор продукта",
  description: showcase.description,
};

export default function ProductPage() {
  return (
    <MarketingSubpage
      title="AutoCore — операционная система автобизнеса"
      description={showcase.description}
      breadcrumbLabel="Продукт"
    >
      <div className="grid gap-12 lg:grid-cols-2 lg:items-start">
        <div className="space-y-6">
          <p className="text-lg leading-relaxed text-muted-foreground">
            AutoCore объединяет склад, цех, продажи и бухгалтерию в одном интерфейсе. То, что вы видите ниже — тот же
            Mission Control, который открывают владельцы каждое утро после входа.
          </p>
          <ul className="space-y-3">
            {showcase.highlights.map((item) => (
              <li key={item} className="flex gap-3 text-sm leading-relaxed text-muted-foreground">
                <span className="mt-2 size-1.5 shrink-0 rounded-full bg-primary" aria-hidden />
                {item}
              </li>
            ))}
          </ul>
          <div className="flex flex-wrap gap-3 pt-2">
            <Button render={<Link href={appLoginUrl()} />}>
              Начать бесплатно
              <ArrowRight className="size-4" data-icon="inline-end" />
            </Button>
            <Button variant="outline" render={<Link href={marketingRoutes.modules} />}>
              Каталог модулей
            </Button>
          </div>
        </div>
        <ProductPreviewFrame />
      </div>

      <div className="mt-16 grid gap-4 md:grid-cols-3">
        <FeatureCard
          icon={Radar}
          tone="blue"
          title="Mission Control"
          description="Утренний обзор: склад, финансы, команда и алерты на одном экране."
          href={`${marketingRoutes.modules}#mission-control`}
        />
        <FeatureCard
          icon={Workflow}
          tone="green"
          title="Связанные процессы"
          description="От остатка до документа — без разрывов между модулями."
          href={`${marketingRoutes.home}#day`}
        />
        <FeatureCard
          icon={RefreshCw}
          tone="amber"
          title="Realtime"
          description="Изменения видны на всех устройствах без ручной выгрузки."
          href={`${marketingRoutes.home}#realtime`}
        />
      </div>

      <section id="for-whom" className="mt-16 scroll-mt-28">
        <h2 className="text-2xl font-semibold tracking-tight">{audience.title}</h2>
        <p className="mt-3 max-w-2xl text-muted-foreground">{audience.description}</p>
        <div className="mt-8 grid gap-4 sm:grid-cols-2">
          {audience.personas.map((persona) => (
            <article key={persona.title} className="landing-card p-6">
              <h3 className="font-semibold">{persona.title}</h3>
              <p className="mt-2 text-sm text-muted-foreground">{persona.promise}</p>
            </article>
          ))}
        </div>
      </section>

      <section className="mt-16">
        <h2 className="text-2xl font-semibold tracking-tight">{platforms.title}</h2>
        <p className="mt-3 max-w-2xl text-muted-foreground">{platforms.description}</p>
        <div className="mt-8 grid gap-4 md:grid-cols-3">
          {[Globe, Monitor, Smartphone].map((Icon, index) => {
            const item = platforms.items[index];
            if (!item) return null;
            return (
              <article key={item.name} className="landing-card p-6">
                <Icon className="mb-3 size-5 text-primary" aria-hidden />
                <h3 className="font-semibold">{item.name}</h3>
                <p className="mt-2 text-sm text-muted-foreground">{item.detail}</p>
              </article>
            );
          })}
        </div>
      </section>
    </MarketingSubpage>
  );
}
