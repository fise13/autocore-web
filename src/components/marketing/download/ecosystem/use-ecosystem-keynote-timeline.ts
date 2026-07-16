"use client";

import { gsap } from "gsap";
import { useEffect, useRef, useState } from "react";

export type KeynotePhoneStatus = "scanning" | "scanned" | "sending" | "sent";
export type KeynoteDesktopStatus = "idle" | "receiving" | "synced";

export type KeynoteSceneSnapshot = {
  vin: string;
  phoneStatus: KeynotePhoneStatus;
  desktopStatus: KeynoteDesktopStatus;
  reservePressed: boolean;
  pulseProgress: number;
  stock: number;
  reserves: number;
  showNotification: boolean;
  showNewRow: boolean;
  showNewActivity: boolean;
};

const VIN = "KMHGC41DPEU123456";
const VIN_PARTIAL = "KMHGC…";

const BASE: KeynoteSceneSnapshot = {
  vin: "—",
  phoneStatus: "scanning",
  desktopStatus: "idle",
  reservePressed: false,
  pulseProgress: 0,
  stock: 4891,
  reserves: 12,
  showNotification: false,
  showNewRow: false,
  showNewActivity: false,
};

type TimelineProxy = {
  phoneStatus: KeynotePhoneStatus;
  desktopStatus: KeynoteDesktopStatus;
  reservePressed: number;
  pulseProgress: number;
  stock: number;
  reserves: number;
  showNotification: number;
  showNewRow: number;
  showNewActivity: number;
  vinReveal: number;
};

type UseEcosystemKeynoteTimelineOptions = {
  enabled: boolean;
  reduced: boolean;
};

export function useEcosystemKeynoteTimeline({ enabled, reduced }: UseEcosystemKeynoteTimelineOptions) {
  const [snapshot, setSnapshot] = useState<KeynoteSceneSnapshot>(BASE);
  const proxyRef = useRef<TimelineProxy>({
    phoneStatus: "scanning",
    desktopStatus: "idle",
    reservePressed: 0,
    pulseProgress: 0,
    stock: 4891,
    reserves: 12,
    showNotification: 0,
    showNewRow: 0,
    showNewActivity: 0,
    vinReveal: 0,
  });

  useEffect(() => {
    if (!enabled) return;

    if (reduced) {
      setSnapshot({
        vin: VIN,
        phoneStatus: "sent",
        desktopStatus: "synced",
        reservePressed: true,
        pulseProgress: 1,
        stock: 4892,
        reserves: 13,
        showNotification: true,
        showNewRow: true,
        showNewActivity: true,
      });
      return;
    }

    const proxy = proxyRef.current;

    const publish = () => {
      setSnapshot({
        vin: proxy.vinReveal >= 1 ? VIN : proxy.vinReveal >= 0.45 ? VIN_PARTIAL : "—",
        phoneStatus: proxy.phoneStatus,
        desktopStatus: proxy.desktopStatus,
        reservePressed: proxy.reservePressed > 0.5,
        pulseProgress: proxy.pulseProgress,
        stock: Math.round(proxy.stock),
        reserves: Math.round(proxy.reserves),
        showNotification: proxy.showNotification > 0.5,
        showNewRow: proxy.showNewRow > 0.5,
        showNewActivity: proxy.showNewActivity > 0.5,
      });
    };

    const reset = () => {
      proxy.phoneStatus = "scanning";
      proxy.desktopStatus = "idle";
      proxy.reservePressed = 0;
      proxy.pulseProgress = 0;
      proxy.stock = 4891;
      proxy.reserves = 12;
      proxy.showNotification = 0;
      proxy.showNewRow = 0;
      proxy.showNewActivity = 0;
      proxy.vinReveal = 0;
      publish();
    };

    const ctx = gsap.context(() => {
      gsap
        .timeline({ repeat: -1, repeatDelay: 2.2, paused: !enabled })
        .add(() => reset())
        // Scan laser sweeps, VIN appears
        .to({}, { duration: 0.85 })
        .to(proxy, {
          vinReveal: 1,
          duration: 0.55,
          ease: "power2.out",
          onUpdate: publish,
        })
        .add(() => {
          proxy.phoneStatus = "scanned";
          publish();
        })
        .to({}, { duration: 0.45 })
        // Tap Reserve
        .add(() => {
          proxy.reservePressed = 1;
          publish();
        })
        .to({}, { duration: 0.12 })
        .add(() => {
          proxy.phoneStatus = "sending";
          publish();
        })
        .to({}, { duration: 0.28 })
        // Blue pulse travels phone → MacBook
        .to(proxy, {
          pulseProgress: 1,
          duration: 1.05,
          ease: "power2.inOut",
          onUpdate: publish,
        })
        // Desktop receives
        .add(() => {
          proxy.desktopStatus = "receiving";
          proxy.showNotification = 1;
          publish();
        })
        .to({}, { duration: 0.16 })
        .add(() => {
          proxy.showNewRow = 1;
          publish();
        })
        .to(
          proxy,
          {
            stock: 4892,
            duration: 0.55,
            ease: "power2.out",
            onUpdate: publish,
          },
          "<0.06",
        )
        .to(
          proxy,
          {
            reserves: 13,
            duration: 0.45,
            ease: "power2.out",
            onUpdate: publish,
          },
          "<0.12",
        )
        .add(() => {
          proxy.showNewActivity = 1;
          publish();
        }, "<0.2")
        .add(() => {
          proxy.phoneStatus = "sent";
          proxy.desktopStatus = "synced";
          publish();
        }, "<0.28")
        .to({}, { duration: 1.45 })
        .add(() => reset());
    });

    return () => ctx.revert();
  }, [enabled, reduced]);

  return snapshot;
}
