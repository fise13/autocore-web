"use client";

import Link from "next/link";
import { useEffect, useState, type ReactNode } from "react";
import { Globe, Smartphone } from "lucide-react";
import { motion, useReducedMotion } from "motion/react";

import { marketingSiteContent } from "@/components/marketing/content/marketing-site-content";
import { EcosystemDeviceShowcase } from "@/components/marketing/download/ecosystem-device-showcase";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { Button } from "@/components/ui/button";
import { useToast } from "@/components/ui/toast-provider";
import { getDesktopDownloadLinks } from "@/lib/desktop/desktop-downloads";
import { marketingRoutes } from "@/lib/marketing-routes";
import { appLoginUrl } from "@/lib/site-urls";
import { userCopy } from "@/lib/user-copy";

const copy = marketingSiteContent.download;
const EASE = [0.16, 1, 0.3, 1] as const;

type PlatformKind = "windows" | "mac" | "web" | "mobile";

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

type ScrollRevealProps = {
  children: ReactNode;
  className?: string;
  delay?: number;
  duration?: number;
  y?: number;
  margin?: string;
};

function ScrollReveal({
  children,
  className,
  delay = 0,
  duration = 0.55,
  y = 16,
  margin = "-60px",
}: ScrollRevealProps) {
  const reduced = useReducedMotion();

  return (
    <motion.div
      className={className}
      initial={reduced ? false : { opacity: 0, y }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin }}
      transition={{ duration, delay, ease: EASE }}
    >
      {children}
    </motion.div>
  );
}

function WindowsIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" className="size-5" aria-hidden>
      <path d="M3 5.5 10.5 4.5V11H3V5.5Zm0 7.5h7.5v6.5L3 18.5V13Zm9-8.5L21 3.5V11H12V4.5Zm0 7.5H21v7.5l-9-1.5V12Z" />
    </svg>
  );
}

function AppleIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" className="size-5" aria-hidden>
      <path d="M18.71 19.5c-.83 1.24-1.71 2.45-3.05 2.47-1.34.03-1.77-.79-3.29-.79-1.53 0-2 .77-3.27.82-1.31.05-2.3-1.32-3.14-2.53C4.25 17 2.94 12.45 4.7 9.39c.87-1.52 2.43-2.48 4.12-2.51 1.28-.02 2.5.87 3.29.87.78 0 2.26-1.07 3.81-.91.65.03 2.47.26 3.64 1.98-.09.06-2.17 1.28-2.15 3.81.03 3.02 2.87 4.03 2.91 4.04-.03.07-.47 1.61-1.43 3.22M13 3.5c.73-.83 1.94-1.46 2.94-1.5.13 1.17-.34 2.35-1.04 3.19-.69.85-1.83 1.51-2.95 1.42-.15-1.15.41-2.35 1.05-3.11z" />
    </svg>
  );
}

function PlatformIcon({ kind }: { kind: PlatformKind | "mobile" }) {
  switch (kind) {
    case "windows":
      return <WindowsIcon />;
    case "mac":
      return <AppleIcon />;
    case "web":
      return <Globe aria-hidden />;
    case "mobile":
      return <Smartphone aria-hidden />;
  }
}

function useDesktopAvailability() {
  const [availability, setAvailability] = useState({ mac: true, windows: true });

  useEffect(() => {
    let cancelled = false;

    void fetch("/api/desktop/downloads", { cache: "no-store" })
      .then((response) => (response.ok ? response.json() : null))
      .then((payload: { platforms?: Record<string, { available?: boolean }> } | null) => {
        if (cancelled || !payload?.platforms) return;
        setAvailability({
          mac: payload.platforms.mac?.available ?? true,
          windows: payload.platforms.windows?.available ?? true,
        });
      })
      .catch(() => undefined);

    return () => {
      cancelled = true;
    };
  }, []);

  return availability;
}

function DownloadPlatformGrid() {
  const links = getDesktopDownloadLinks();
  const availability = useDesktopAvailability();
  const { toast } = useToast();
  const webUrl = appLoginUrl();

  function notifyUnavailable(platform: "mac" | "windows") {
    toast({
      title: userCopy.desktop.downloadUnavailableTitle,
      description:
        platform === "windows"
          ? userCopy.desktop.windowsUnavailable
          : userCopy.desktop.macUnavailable,
    });
  }

  function handleDesktop(platform: "mac" | "windows") {
    const available = platform === "mac" ? availability.mac : availability.windows;
    const url = platform === "mac" ? links.mac : links.windows;
    if (!available) {
      notifyUnavailable(platform);
      return;
    }
    window.location.assign(url);
  }

  return (
    <ul className="download-platform-grid">
      {copy.platforms.map((platform, index) => {
        const kind = platform.kind as PlatformKind;
        const isDesktop = kind === "mac" || kind === "windows";
        const isMobile = kind === "mobile";

        return (
          <li key={platform.id}>
            <ScrollReveal delay={0.06 + index * 0.06} y={18} margin="-40px">
              {isDesktop ? (
                <button
                  type="button"
                  className="download-platform-card"
                  onClick={() => handleDesktop(kind as "mac" | "windows")}
                >
                  <PlatformCardContent platform={platform} kind={kind} />
                </button>
              ) : isMobile ? (
                <Link href={marketingRoutes.downloadMobile} className="download-platform-card">
                  <PlatformCardContent platform={platform} kind="mobile" />
                </Link>
              ) : (
                <a href={webUrl} className="download-platform-card">
                  <PlatformCardContent platform={platform} kind="web" />
                </a>
              )}
            </ScrollReveal>
          </li>
        );
      })}
    </ul>
  );
}

function PlatformCardContent({
  platform,
  kind,
}: {
  platform: (typeof copy.platforms)[number];
  kind: PlatformKind | "mobile";
}) {
  return (
    <>
      <span className="download-platform-icon" aria-hidden>
        <PlatformIcon kind={kind} />
      </span>
      <h3 className="exp-display download-platform-title">{platform.title}</h3>
      <p className="download-platform-description">{platform.description}</p>
      <span className="download-platform-action">{platform.action}</span>
    </>
  );
}

export function DownloadExperience() {
  const [openFaq, setOpenFaq] = useState<string[]>(["faq-0"]);

  function handleFaqChange(next: string[]) {
    if (next.length === 0) {
      setOpenFaq([]);
      return;
    }
    const latest = next[next.length - 1];
    setOpenFaq(latest ? [latest] : []);
  }

  return (
    <div className="download-page">
      <section className="download-panel download-panel-hero" aria-label="Скачать">
        <div className="exp-section-inner download-panel-inner">
          <HeroReveal delay={0} duration={0.72} y={22}>
            <h1 className="exp-display download-hero-title">
              <span className="block">{copy.hero.titleLine1}</span>
            </h1>
          </HeroReveal>

          <HeroReveal className="download-hero-title-line2" delay={0.38} duration={0.58} y={16}>
            <p className="exp-display text-muted-foreground">{copy.hero.titleLine2}</p>
          </HeroReveal>

          <HeroReveal className="download-hero-sub" delay={0.55} duration={0.5} y={12}>
            <p className="download-hero-description">{copy.hero.description}</p>
          </HeroReveal>
        </div>
      </section>

      <section className="download-panel" aria-labelledby="download-platforms-heading">
        <div className="exp-section-inner download-panel-inner download-platforms-inner">
          <ScrollReveal margin="-80px">
            <h2 id="download-platforms-heading" className="sr-only">
              Выберите платформу
            </h2>
          </ScrollReveal>
          <DownloadPlatformGrid />
        </div>
      </section>

      <section className="download-panel download-panel-ecosystem" aria-labelledby="download-ecosystem-heading">
        <div className="exp-section-inner download-ecosystem-inner">
          <ScrollReveal margin="-80px">
            <h2 id="download-ecosystem-heading" className="exp-display download-ecosystem-title">
              {copy.ecosystem.title}
            </h2>
          </ScrollReveal>

          <ScrollReveal delay={0.08} y={12} margin="-50px">
            <p className="download-ecosystem-description">{copy.ecosystem.description}</p>
          </ScrollReveal>

          <ScrollReveal className="download-ecosystem-visual" delay={0.14} y={18} margin="-40px">
            <EcosystemDeviceShowcase className="download-ecosystem-devices" />
          </ScrollReveal>
        </div>
      </section>

      <section className="download-panel" aria-labelledby="download-travels-heading">
        <div className="exp-section-inner download-panel-inner">
          <ScrollReveal margin="-80px">
            <h2 id="download-travels-heading" className="exp-display download-travels-title">
              {copy.travels.title}
            </h2>
          </ScrollReveal>

          <ul className="download-travels-list">
            {copy.travels.items.map((item, index) => (
              <li key={item}>
                <ScrollReveal delay={0.06 + index * 0.05} y={14} margin="-40px">
                  <span className="download-travels-item">{item}</span>
                </ScrollReveal>
              </li>
            ))}
          </ul>
        </div>
      </section>

      <section className="download-panel download-panel-requirements" aria-labelledby="download-requirements-heading">
        <div className="exp-section-inner download-panel-inner download-requirements-inner">
          <ScrollReveal margin="-80px">
            <h2 id="download-requirements-heading" className="exp-display download-requirements-title">
              {copy.requirements.title}
            </h2>
          </ScrollReveal>

          <dl className="download-requirements-list">
            {copy.requirements.items.map((item, index) => (
              <ScrollReveal key={item.platform} delay={0.06 + index * 0.05} margin="-40px">
                <div className="download-requirements-row">
                  <dt>{item.platform}</dt>
                  <dd>{item.detail}</dd>
                </div>
              </ScrollReveal>
            ))}
          </dl>
        </div>
      </section>

      <section className="download-panel" aria-labelledby="download-faq-heading">
        <div className="exp-section-inner download-panel-inner download-faq-inner">
          <ScrollReveal margin="-80px">
            <h2 id="download-faq-heading" className="exp-display download-faq-title">
              Вопросы об установке
            </h2>
          </ScrollReveal>

          <ScrollReveal delay={0.06} margin="-50px">
            <Accordion value={openFaq} onValueChange={handleFaqChange} className="download-faq-accordion">
              {copy.faq.map((item, index) => (
                <AccordionItem key={item.q} value={`faq-${index}`} className="download-faq-item">
                  <AccordionTrigger>
                    <span className="download-faq-question">{item.q}</span>
                  </AccordionTrigger>
                  <AccordionContent>
                    <p className="download-faq-answer">{item.a}</p>
                  </AccordionContent>
                </AccordionItem>
              ))}
            </Accordion>
          </ScrollReveal>
        </div>
      </section>

      <section className="download-panel download-panel-close" aria-labelledby="download-close-heading">
        <div className="exp-section-inner download-panel-inner download-close-inner">
          <ScrollReveal margin="-80px" y={14}>
            <h2 id="download-close-heading" className="exp-display download-close-title">
              {copy.closing.line}
            </h2>
          </ScrollReveal>

          <ScrollReveal className="download-close-cta" delay={0.12} y={10} margin="-50px">
            <Button
              size="lg"
              className="h-10 min-w-[11rem] px-5 text-sm"
              render={<Link href={appLoginUrl()} />}
              nativeButton={false}
            >
              {copy.closing.button}
            </Button>
          </ScrollReveal>
        </div>
      </section>
    </div>
  );
}
