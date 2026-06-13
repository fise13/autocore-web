import Link from "next/link";
import { ArrowRight, Mail, Rocket, Building2 } from "lucide-react";

import { marketingSiteContent } from "@/components/marketing/content/marketing-site-content";
import { MarketingExtraJsonLd } from "@/components/marketing/seo/marketing-json-ld";
import { MarketingFaq } from "@/components/marketing/site/marketing-faq";
import { MarketingSection } from "@/components/marketing/site/marketing-section";
import { MarketingSubpage } from "@/components/marketing/site/marketing-subpage";
import { marketingRoutes } from "@/lib/marketing-routes";
import { buildMarketingMetadata } from "@/lib/seo/build-marketing-metadata";
import { buildBreadcrumbJsonLd, buildFaqJsonLd } from "@/lib/seo/marketing-seo";
import { appDemoUrl } from "@/lib/site-urls";
import { Button } from "@/components/ui/button";

const copy = marketingSiteContent.contact;

const CHANNELS = [
  { icon: Rocket, featured: true },
  { icon: Mail, featured: false },
  { icon: Building2, featured: false },
] as const;

export const metadata = buildMarketingMetadata("contact");

export const revalidate = 3600;

export default function ContactPage() {
  return (
    <>
      <MarketingExtraJsonLd
        extra={[buildBreadcrumbJsonLd("contact"), buildFaqJsonLd(marketingSiteContent.faq.items)]}
      />
      <MarketingSubpage
        title={copy.hero.title}
        description={copy.hero.description}
        breadcrumbLabel="Контакты"
        eyebrow="Контакты"
      >
        <div className="marketing-channel-grid">
        {copy.channels.map((channel, i) => {
          const { icon: Icon, featured } = CHANNELS[i] ?? CHANNELS[1];
          const href = channel.href === "app" ? appDemoUrl() : channel.href;
          const external = channel.href.startsWith("mailto:");
          return (
            <article
              key={channel.title}
              className={featured ? "marketing-channel-card is-featured" : "marketing-channel-card"}
            >
              <span className="marketing-channel-icon" aria-hidden>
                <Icon className="size-5" strokeWidth={1.75} />
              </span>
              <h2 className="mt-5 text-lg font-semibold">{channel.title}</h2>
              <p className="mt-3 flex-1 text-sm leading-relaxed text-muted-foreground">{channel.body}</p>
              <Link
                href={href}
                className="marketing-channel-action"
                {...(external ? { target: "_blank", rel: "noopener noreferrer" } : {})}
              >
                {channel.action}
                <ArrowRight className="size-3.5" aria-hidden />
              </Link>
            </article>
          );
        })}
      </div>

      <MarketingSection title={copy.steps.title} className="mt-20">
        <ol className="marketing-onboarding-steps">
          {copy.steps.items.map((item) => (
            <li key={item.step} className="marketing-onboarding-step">
              <span className="marketing-onboarding-num">{item.step}</span>
              <div>
                <h3 className="font-semibold">{item.title}</h3>
                <p className="mt-1 text-sm text-muted-foreground">{item.body}</p>
              </div>
            </li>
          ))}
        </ol>
        <div className="mt-10 flex justify-center">
          <Button size="lg" render={<Link href={appDemoUrl()} />}>
            Начать сейчас
            <ArrowRight className="size-4" data-icon="inline-end" />
          </Button>
        </div>
      </MarketingSection>

      <MarketingSection title="Вопросы" className="mt-16">
        <MarketingFaq items={marketingSiteContent.faq.items} />
        <p className="mt-6 text-center text-sm text-muted-foreground">
          <Link href={marketingRoutes.pricing} className="font-medium text-primary hover:underline">
            Смотреть тарифы
          </Link>
        </p>
      </MarketingSection>
      </MarketingSubpage>
    </>
  );
}
