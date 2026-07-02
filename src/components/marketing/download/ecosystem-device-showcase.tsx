"use client";

import { useRef } from "react";
import { useInView, useReducedMotion } from "motion/react";

import { KeynoteDesktopUi } from "@/components/marketing/download/ecosystem/keynote-desktop-ui";
import { KeynotePhoneUi } from "@/components/marketing/download/ecosystem/keynote-phone-ui";
import { KeynoteSyncBeam } from "@/components/marketing/download/ecosystem/keynote-sync-beam";
import { useEcosystemKeynoteTimeline } from "@/components/marketing/download/ecosystem/use-ecosystem-keynote-timeline";
import { IPhone16ProFrame } from "@/components/marketing/experience/devices/iphone-16-pro-frame";
import { MacBookProFrame } from "@/components/marketing/experience/devices/macbook-pro-frame";
import { useMouseDepth } from "@/components/marketing/experience/motion/use-mouse-depth";
import { cn } from "@/lib/utils";

type EcosystemDeviceShowcaseProps = {
  className?: string;
};

export function EcosystemDeviceShowcase({ className }: EcosystemDeviceShowcaseProps) {
  const reduced = useReducedMotion();
  const rootRef = useRef<HTMLDivElement>(null);
  const inView = useInView(rootRef, { margin: "-10% 0px", amount: 0.25 });
  const parallaxRef = useMouseDepth<HTMLDivElement>({
    enabled: !reduced,
    maxRotate: 0.6,
    maxTranslate: 2,
  });

  const snapshot = useEcosystemKeynoteTimeline({ enabled: inView, reduced: !!reduced });

  const beamActive = snapshot.pulseProgress > 0 && snapshot.phoneStatus === "sending";

  return (
    <div ref={rootRef} className={cn("keynote-scene", className)}>
      <div className="keynote-scene-vignette" aria-hidden />

      <div ref={parallaxRef} className="keynote-scene-composition">
        <div className="keynote-scene-desk">
          <div className="keynote-scene-desk-shadow" aria-hidden />

          <div className="keynote-scene-mac">
            <MacBookProFrame windowTitle="AutoCore — Mission Control" className="keynote-macbook">
              <KeynoteDesktopUi snapshot={snapshot} />
            </MacBookProFrame>
          </div>

          <div className="keynote-scene-phone">
            <IPhone16ProFrame className="keynote-iphone">
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
  );
}
