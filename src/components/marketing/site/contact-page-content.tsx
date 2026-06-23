"use client";

import Link from "next/link";
import { ArrowRight, Building2, Mail, Rocket } from "lucide-react";
import { useRef } from "react";

import { marketingSiteContent } from "@/components/marketing/content/marketing-site-content";
import { MarketingFaq } from "@/components/marketing/site/marketing-faq";
import { MarketingSection } from "@/components/marketing/site/marketing-section";
import {
  useGsapReveal,
  useGsapStaggerChildren,
} from "@/components/marketing/motion/use-gsap-reveal";
import { marketingRoutes } from "@/lib/marketing-routes";
import { appDemoUrl } from "@/lib/site-urls";
import { Button } from "@/components/ui/button";

const copy = marketingSiteContent.contact;

const CHANNELS = [
  { icon: Rocket, featured: true },
  { icon: Mail, featured: false },
  { icon: Building2, featured: false },
] as const;

export function ContactPageContent() {
  const ref = useRef<HTMLDivElement>(null);
  useGsapStaggerChildren(ref, "[data-contact-channels]", "[data-contact-channel]", { stagger: 0.12 });
  useGsapStaggerChildren(ref, ".marketing-onboarding-steps", ".marketing-onboarding-step", {
    stagger: 0.1,
    y: 16,
  });
  useGsapReveal(ref, "[data-contact-reveal]", { stagger: 0.08 });

  return (
    <div ref={ref}>
      <div className="marketing-channel-grid" data-contact-channels>
        {copy.channels.map((channel, i) => {
          const { icon: Icon, featured } = CHANNELS[i] ?? CHANNELS[1];
          const href = channel.href === "app" ? appDemoUrl() : channel.href;
          const external = channel.href.startsWith("mailto:");
          return (
            <article
              key={channel.title}
              data-contact-channel
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
        <div className="mt-10 flex justify-center" data-contact-reveal>
          <Button size="lg" render={<Link href={appDemoUrl()} />}>
            Начать сейчас
            <ArrowRight className="size-4" data-icon="inline-end" />
          </Button>
        </div>
      </MarketingSection>

      <MarketingSection title="Вопросы" className="mt-16">
        <div data-contact-reveal>
          <MarketingFaq items={marketingSiteContent.faq.items} />
        </div>
        <p className="mt-6 text-center text-sm text-muted-foreground" data-contact-reveal>
          <Link href={marketingRoutes.pricing} className="font-medium text-primary hover:underline">
            Смотреть тарифы
          </Link>
        </p>
      </MarketingSection>
    </div>
  );
}
