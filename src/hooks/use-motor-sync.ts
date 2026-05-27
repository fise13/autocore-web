"use client";

import { useCallback, useMemo, useState } from "react";

import { initialMotorSyncState, MotorSyncState } from "@/domain/motor-sync";
import { MotorEntity } from "@/domain/motor";
import { MotorRepository } from "@/infrastructure/firestore/motor-repository";
import {
  readMotorSyncMeta,
  writeMotorSyncMeta,
} from "@/infrastructure/firestore/motor-sync-meta-repository";
import { prepareSyncAuth } from "@/lib/auth/prepare-sync-auth";
import { mapAuthError } from "@/lib/user-copy";

type UseMotorSyncParams = {
  uid: string;
  companyId: string;
  repository: MotorRepository;
  motors: MotorEntity[];
  localDirty: boolean;
  flushLocalSave: () => Promise<void>;
  onRemoteApplied: () => void;
};

export function useMotorSync({
  uid,
  companyId,
  motors,
  localDirty,
  flushLocalSave,
  onRemoteApplied,
}: UseMotorSyncParams) {
  const [state, setState] = useState<MotorSyncState>(initialMotorSyncState);

  const remotePending = useMemo(() => {
    if (!state.lastSyncedAt) return false;
    const baseline = state.lastSyncedAt.getTime();
    return motors.some((motor) => {
      const updated = motor.updatedAt?.getTime() ?? motor.createdAt?.getTime() ?? 0;
      return updated > baseline;
    });
  }, [motors, state.lastSyncedAt]);

  const syncState: MotorSyncState = useMemo(
    () => ({
      ...state,
      localDirty,
      remotePending: remotePending && !localDirty,
    }),
    [state, localDirty, remotePending],
  );

  const syncNow = useCallback(async () => {
    if (!uid || !companyId) {
      throw new Error("Синхронизация недоступна: войдите и подключите компанию.");
    }
    setState((current) => ({ ...current, status: "syncing", errorMessage: null }));
    try {
      await prepareSyncAuth(uid);
      await flushLocalSave();
      if (localDirty) {
        await writeMotorSyncMeta(uid, { lastPushedAt: new Date(), companyId });
      }
      const meta = await readMotorSyncMeta(uid);
      onRemoteApplied();
      setState({
        status: "idle",
        localDirty: false,
        remotePending: false,
        lastSyncedAt: meta?.lastPulledAt ?? meta?.lastPushedAt ?? new Date(),
        errorMessage: null,
      });
    } catch (error) {
      setState((current) => ({
        ...current,
        status: "error",
        errorMessage: mapAuthError(error),
      }));
      throw error;
    }
  }, [companyId, flushLocalSave, localDirty, onRemoteApplied, uid]);

  const markSynced = useCallback(async () => {
    if (!uid) return;
    await writeMotorSyncMeta(uid, { lastPulledAt: new Date(), companyId });
    setState((current) => ({
      ...current,
      lastSyncedAt: new Date(),
      remotePending: false,
      status: "idle",
    }));
  }, [companyId, uid]);

  return { syncState, syncNow, markSynced, setSyncState: setState };
}
