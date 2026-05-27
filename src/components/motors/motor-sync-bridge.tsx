"use client";

import { useEffect, useState } from "react";

import { useWorkspace } from "@/components/layout/workspace-context";
import { MotorEntity } from "@/domain/motor";
import { useMotorSync } from "@/hooks/use-motor-sync";
import { readMotorSyncMeta } from "@/infrastructure/firestore/motor-sync-meta-repository";
import { MotorRepository } from "@/infrastructure/firestore/motor-repository";

type UseMotorSyncBridgeParams = {
  uid: string;
  companyId: string;
  repository: MotorRepository;
  motors: MotorEntity[];
  localDirty: boolean;
};

export function useMotorSyncBridge({
  uid,
  companyId,
  repository,
  motors,
  localDirty,
}: UseMotorSyncBridgeParams) {
  const { setMotorSyncState, registerSyncHandler, triggerSave, triggerCloudPush } = useWorkspace();
  const [baselineLoaded, setBaselineLoaded] = useState(false);

  const { syncState, syncNow, markSynced } = useMotorSync({
    uid,
    companyId,
    repository,
    motors,
    localDirty,
    flushLocalSave: async () => {
      triggerSave();
      await triggerCloudPush();
    },
    onRemoteApplied: () => undefined,
  });

  useEffect(() => {
    if (!uid) return;
    readMotorSyncMeta(uid)
      .then((meta) => {
        if (meta?.lastPulledAt || meta?.lastPushedAt) {
          setMotorSyncState((current) => ({
            ...current,
            lastSyncedAt: meta.lastPulledAt ?? meta.lastPushedAt ?? null,
          }));
        }
        setBaselineLoaded(true);
      })
      .catch(() => setBaselineLoaded(true));
  }, [setMotorSyncState, uid]);

  useEffect(() => {
    if (baselineLoaded && !localDirty && motors.length > 0 && !syncState.lastSyncedAt) {
      void markSynced();
    }
  }, [baselineLoaded, localDirty, markSynced, motors.length, syncState.lastSyncedAt]);

  useEffect(() => {
    setMotorSyncState(syncState);
  }, [setMotorSyncState, syncState]);

  useEffect(() => {
    registerSyncHandler(syncNow);
    return () => registerSyncHandler(null);
  }, [registerSyncHandler, syncNow]);
}
