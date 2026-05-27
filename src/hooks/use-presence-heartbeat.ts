"use client";

import { useEffect } from "react";

import { createPresenceRepository } from "@/infrastructure/firestore/presence-repository";

const presenceRepository = createPresenceRepository();
const HEARTBEAT_MS = 5 * 60 * 1000;

export function usePresenceHeartbeat(companyId: string, uid: string, enabled: boolean) {
  useEffect(() => {
    if (!enabled || !companyId || !uid) return;

    const touch = () => {
      void presenceRepository.touchLastActive(companyId, uid).catch(() => undefined);
    };

    touch();
    const interval = window.setInterval(touch, HEARTBEAT_MS);
    return () => window.clearInterval(interval);
  }, [companyId, enabled, uid]);
}
