"use client";

import { useRef } from "react";
import { Radio } from "lucide-react";
import { useInView, useReducedMotion } from "motion/react";

import { KeynoteDesktopUi } from "@/components/marketing/download/ecosystem/keynote-desktop-ui";
import { KeynotePhoneUi } from "@/components/marketing/download/ecosystem/keynote-phone-ui";
import { KeynoteSyncBeam } from "@/components/marketing/download/ecosystem/keynote-sync-beam";
import { useEcosystemKeynoteTimeline } from "@/components/marketing/download/ecosystem/use-ecosystem-keynote-timeline";
import { IPhone16ProFrame } from "@/components/marketing/experience/devices/iphone-16-pro-frame";
import { MacBookProFrame } from "@/components/marketing/experience/devices/macbook-pro-frame";
import { useMouseDepth } from "@/components/marketing/experience/motion/use-mouse-depth";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

type PlatformSyncExperienceProps = {
  className?: string;
  hideHeader?: boolean;
};

/**
 * Marketing desk scene: real iPhone + MacBook with live warehouse sync narrative.
 * Replaces the old abstract side-by-side cards.
 */
export function PlatformSyncExperience({ className, hideHeader = false }: PlatformSyncExperienceProps) {
  const reduced = useReducedMotion();
  const rootRef = useRef<HTMLDivElement>(null);
  const inView = useInView(rootRef, { margin: "-12% 0px", amount: 0.22 });
  const parallaxRef = useMouseDepth<HTMLDivElement>({
    enabled: !reduced,
    maxRotate: 0.7,
    maxTranslate: 2.5,
  });

  const snapshot = useEcosystemKeynoteTimeline({ enabled: inView, reduced: !!reduced });
  const beamActive = snapshot.pulseProgress > 0 && snapshot.phoneStatus === "sending";
  const live =
    snapshot.desktopStatus === "synced" ||
    snapshot.phoneStatus === "sent" ||
    snapshot.desktopStatus === "receiving";

  return (
    <div ref={rootRef} className={cn("platform-sync-root", className)}>
      {!hideHeader ? (
        <div className="platform-sync-status">
          <p className="platform-sync-status-label">Одна система на двух устройствах</p>
          <Badge variant="outline" className="gap-1 font-normal text-[10px]">
            <Radio className={cn("size-3", live && !reduced && "text-primary")} aria-hidden />
            {snapshot.desktopStatus === "synced"
              ? "Связь активна"
              : snapshot.phoneStatus === "sending" || snapshot.desktopStatus === "receiving"
                ? "Синхронизация"
                : snapshot.phoneStatus === "scanning"
                  ? "Сканирование"
                  : "Готово к отправке"}
          </Badge>
        </div>
      ) : null}

      <div className="keynote-scene platform-sync-scene">
        <div className="keynote-scene-vignette" aria-hidden />
        <div className="platform-sync-atmosphere" aria-hidden />

        <div ref={parallaxRef} className="keynote-scene-composition">
          <div className="keynote-scene-desk platform-sync-desk">
            <div className="keynote-scene-desk-shadow" aria-hidden />

            <div className="keynote-scene-mac">
              <MacBookProFrame windowTitle="AutoCore · Mission Control" className="keynote-macbook">
                <KeynoteDesktopUi snapshot={snapshot} />
              </MacBookProFrame>
            </div>

            <div className="keynote-scene-phone">
              <IPhone16ProFrame className="keynote-iphone" time="12:41">
                <KeynotePhoneUi snapshot={snapshot} />
              </IPhone16ProFrame>
            </div>

            <KeynoteSyncBeam
              progress={snapshot.pulseProgress}
              active={beamActive}
              className="keynote-scene-beam"
            />
          </div>
        </div>
      </div>
    </div>
  );
}
