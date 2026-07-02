"use client";

import { gsap } from "gsap";
import { useEffect, useRef, useState } from "react";

export type KeynotePhoneStatus = "scanned" | "sending" | "sent";
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

const BASE: KeynoteSceneSnapshot = {
  vin: VIN,
  phoneStatus: "scanned",
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
};

type UseEcosystemKeynoteTimelineOptions = {
  enabled: boolean;
  reduced: boolean;
};

export function useEcosystemKeynoteTimeline({ enabled, reduced }: UseEcosystemKeynoteTimelineOptions) {
  const [snapshot, setSnapshot] = useState<KeynoteSceneSnapshot>(BASE);
  const proxyRef = useRef<TimelineProxy>({
    phoneStatus: "scanned",
    desktopStatus: "idle",
    reservePressed: 0,
    pulseProgress: 0,
    stock: 4891,
    reserves: 12,
    showNotification: 0,
    showNewRow: 0,
    showNewActivity: 0,
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
        vin: VIN,
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
      proxy.phoneStatus = "scanned";
      proxy.desktopStatus = "idle";
      proxy.reservePressed = 0;
      proxy.pulseProgress = 0;
      proxy.stock = 4891;
      proxy.reserves = 12;
      proxy.showNotification = 0;
      proxy.showNewRow = 0;
      proxy.showNewActivity = 0;
      publish();
    };

    const ctx = gsap.context(() => {
      gsap
        .timeline({ repeat: -1, repeatDelay: 2.4, paused: !enabled })
        .add(() => reset())
        // VIN already scanned — hold, then tap Reserve
        .to({}, { duration: 0.55 })
        .add(() => {
          proxy.reservePressed = 1;
          publish();
        })
        .to({}, { duration: 0.12 })
        .add(() => {
          proxy.phoneStatus = "sending";
          publish();
        })
        .to({}, { duration: 0.35 })
        // Blue pulse travels phone → MacBook
        .add(() => {
          proxy.phoneStatus = "sending";
          publish();
        })
        .to(proxy, {
          pulseProgress: 1,
          duration: 0.95,
          ease: "power2.inOut",
          onUpdate: publish,
        })
        // Desktop receives
        .add(() => {
          proxy.desktopStatus = "receiving";
          proxy.showNotification = 1;
          publish();
        })
        .to({}, { duration: 0.18 })
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
        .to({}, { duration: 1.35 })
        .add(() => reset());
    });

    return () => ctx.revert();
  }, [enabled, reduced]);

  return snapshot;
}
