"use client";

import Link from "next/link";
import { useEffect, useState, type ReactNode } from "react";
import { motion, useReducedMotion } from "motion/react";

import { marketingSiteContent } from "@/components/marketing/content/marketing-site-content";
import { buildDocumentQrDataUri } from "@/lib/documents/qr-code";
import { marketingRoutes } from "@/lib/marketing-routes";
import { getMobileDownloadLinks } from "@/lib/mobile/mobile-download-links";
import { cn } from "@/lib/utils";

const copy = marketingSiteContent.downloadMobile;
const links = getMobileDownloadLinks();
const EASE = [0.16, 1, 0.3, 1] as const;

type MobilePlatform = "ios" | "android";

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

function AndroidIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" className="size-5" aria-hidden>
      <path d="M6.5 2.75a1.25 1.25 0 1 1 0 2.5 1.25 1.25 0 0 1 0-2.5Zm11 0a1.25 1.25 0 1 1 0 2.5 1.25 1.25 0 0 1 0-2.5ZM4.5 7.5a2 2 0 0 0-2 2v7.25A2.25 2.25 0 0 0 4.75 19h14.5a2.25 2.25 0 0 0 2.25-2.25V9.5a2 2 0 0 0-2-2h-15Zm1.1 10.25-.35-2.45a9.2 9.2 0 0 0 14.7 0l-.35 2.45H5.6Z" />
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

function PlatformIcon({ platform }: { platform: MobilePlatform }) {
  return platform === "ios" ? <AppleIcon /> : <AndroidIcon />;
}

function MobileDownloadReveal({
  platform,
  onClose,
}: {
  platform: MobilePlatform;
  onClose: () => void;
}) {
  const reduced = useReducedMotion();
  const platformCopy = copy.platforms.find((item) => item.id === platform)!;
  const installUrl = platform === "ios" ? links.ios : links.android;
  const hasUrl = installUrl.length > 0;
  const [qrDataUri, setQrDataUri] = useState<string | null>(null);

  useEffect(() => {
    if (!hasUrl) {
      setQrDataUri(null);
      return;
    }

    let cancelled = false;

    void buildDocumentQrDataUri(installUrl, 200).then((dataUri) => {
      if (!cancelled) setQrDataUri(dataUri);
    });

    return () => {
      cancelled = true;
    };
  }, [hasUrl, installUrl]);

  return (
    <motion.div
      className="download-mobile-reveal"
      initial={reduced ? false : { opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      exit={reduced ? undefined : { opacity: 0, y: 8 }}
      transition={{ duration: 0.45, ease: EASE }}
      role="region"
      aria-labelledby={`download-mobile-reveal-${platform}`}
    >
      <div className="download-mobile-reveal-header">
        <h2 id={`download-mobile-reveal-${platform}`} className="exp-display download-mobile-reveal-title">
          {platformCopy.title}
        </h2>
        <button type="button" className="download-mobile-reveal-back" onClick={onClose}>
          Изменить выбор
        </button>
      </div>

      <div className="download-mobile-reveal-body">
        <div className="download-mobile-qr-block">
          <p className="download-mobile-reveal-label">{copy.reveal.qrLabel}</p>
          {hasUrl && qrDataUri ? (
            <img
              src={qrDataUri}
              alt={`QR-код для установки AutoCore на ${platformCopy.title}`}
              className="download-mobile-qr-image"
              width={200}
              height={200}
            />
          ) : (
            <div className="download-mobile-qr-placeholder" aria-hidden>
              <span className="download-mobile-qr-placeholder-text">{copy.reveal.placeholderQr}</span>
            </div>
          )}
        </div>

        <div className="download-mobile-link-block">
          <p className="download-mobile-reveal-label">{copy.reveal.linkLabel}</p>
          {hasUrl ? (
            <a href={installUrl} className="download-mobile-install-link" target="_blank" rel="noopener noreferrer">
              {installUrl.replace(/^https?:\/\//, "")}
            </a>
          ) : (
            <p className="download-mobile-link-placeholder">{copy.reveal.placeholderLink}</p>
          )}
        </div>
      </div>
    </motion.div>
  );
}

export function MobileDownloadExperience() {
  const [selected, setSelected] = useState<MobilePlatform | null>(null);

  return (
    <div className="download-page download-mobile-page">
      <section className="download-panel download-panel-hero download-mobile-hero" aria-label="Mobile">
        <div className="exp-section-inner download-panel-inner">
          <HeroReveal delay={0} duration={0.55} y={12}>
            <Link href={marketingRoutes.download} className="download-mobile-back">
              {copy.backLabel}
            </Link>
          </HeroReveal>

          <HeroReveal delay={0.12} duration={0.72} y={22}>
            <h1 className="exp-display download-mobile-hero-title">{copy.hero.title}</h1>
          </HeroReveal>

          <HeroReveal className="download-mobile-hero-sub" delay={0.38} duration={0.58} y={16}>
            <p className="download-hero-description">{copy.hero.description}</p>
          </HeroReveal>
        </div>
      </section>

      <section className="download-panel download-mobile-panel" aria-labelledby="download-mobile-platforms-heading">
        <div className="exp-section-inner download-panel-inner download-mobile-inner">
          <h2 id="download-mobile-platforms-heading" className="sr-only">
            Выберите платформу
          </h2>

          <ul className="download-mobile-platform-grid">
            {copy.platforms.map((platform) => {
              const id = platform.id as MobilePlatform;
              const isSelected = selected === id;

              return (
                <li key={platform.id}>
                  <button
                    type="button"
                    className={cn("download-mobile-platform-card", isSelected && "is-selected")}
                    onClick={() => setSelected(id)}
                    aria-pressed={isSelected}
                  >
                    <span className="download-platform-icon" aria-hidden>
                      <PlatformIcon platform={id} />
                    </span>
                    <h3 className="exp-display download-platform-title">{platform.title}</h3>
                    <p className="download-platform-description">{platform.description}</p>
                    <span className="download-platform-action">{platform.action}</span>
                  </button>
                </li>
              );
            })}
          </ul>

          {selected ? (
            <MobileDownloadReveal platform={selected} onClose={() => setSelected(null)} />
          ) : null}
        </div>
      </section>
    </div>
  );
}
