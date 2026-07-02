"use client";

import { useEffect, useRef, useState } from "react";
import { Smartphone } from "lucide-react";
import { useInView } from "motion/react";

import { DesktopSyncWorkspace } from "@/components/marketing/experience/mocks/desktop-sync-workspace";
import { InventoryMock } from "@/components/marketing/experience/mocks/inventory-mock";
import { SyncConnectionBridge } from "@/components/marketing/experience/mocks/sync-connection-bridge";
import {
  PLATFORM_SYNC_INTERVAL_MS,
  PLATFORM_SYNC_STEPS,
  type PlatformSyncStep,
} from "@/components/marketing/experience/motion/platform-sync-steps";
import { useLiveSequence } from "@/components/marketing/experience/motion/use-live-sequence";
import { usePrefersReducedMotion } from "@/components/marketing/motion/use-landing-gsap";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

type PlatformSyncExperienceProps = {
  className?: string;
  hideHeader?: boolean;
};

export function PlatformSyncExperience({ className, hideHeader = false }: PlatformSyncExperienceProps) {
  const reduced = usePrefersReducedMotion();
  const rootRef = useRef<HTMLDivElement>(null);
  const demosInView = useInView(rootRef, { margin: "-15% 0px", amount: 0.25 });
  const { step, index } = useLiveSequence(PLATFORM_SYNC_STEPS, {
    intervalMs: PLATFORM_SYNC_INTERVAL_MS,
    paused: !demosInView,
  });
  const [pulseKey, setPulseKey] = useState(0);

  useEffect(() => {
    if (step === "detect" || step === "sync") {
      setPulseKey((k) => k + 1);
    }
  }, [step]);

  const syncStep = reduced ? "live" : step;

  return (
    <div ref={rootRef} className={cn("flex flex-col gap-3", className)}>
      {!hideHeader ? (
        <div className="flex items-center justify-between gap-2 px-0.5">
          <p className="text-xs text-muted-foreground">Одна система на двух устройствах</p>
          <Badge variant="outline" className="gap-1 font-normal text-[10px]">
            <Smartphone className="size-3" aria-hidden />
            {syncStep === "live" ? "Связь активна" : "Синхронизация"}
          </Badge>
        </div>
      ) : null}

      <div
        className={cn(
          "grid items-start gap-3",
          "max-sm:grid-cols-1",
          "sm:grid-cols-[minmax(0,1fr)_auto_minmax(0,1.15fr)]",
        )}
      >
        <div className="max-sm:order-1">
          <InventoryMock variant="plain" phase={syncStep} controlled />
        </div>

        <SyncConnectionBridge step={syncStep} pulseKey={pulseKey + index} />

        <div className="max-sm:order-3">
          <DesktopSyncWorkspace step={syncStep} />
        </div>
      </div>
    </div>
  );
}
