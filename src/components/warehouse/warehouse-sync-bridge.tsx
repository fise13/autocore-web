"use client";

import { useCallback, useEffect } from "react";

import { useWorkspace } from "@/components/layout/workspace-context";
import { userCopy } from "@/lib/user-copy";

type UseWarehouseSyncBridgeParams = {
  companyId: string;
  actorUserId: string;
  localDirty: boolean;
  enabled?: boolean;
};

/**
 * Mirrors motors `useMotorSyncBridge`: owns ⌘S sync registration while the grid
 * only exposes `registerCloudPushHandler(pushToCloud)`.
 */
export function useWarehouseSyncBridge({
  companyId,
  actorUserId,
  localDirty: _localDirty,
  enabled = true,
}: UseWarehouseSyncBridgeParams) {
  const { registerSyncHandler, triggerSave, triggerCloudPush } = useWorkspace();

  const syncNow = useCallback(async () => {
    if (!actorUserId || !companyId) {
      throw new Error(userCopy.layout.saveUnavailable);
    }
    triggerSave();
    await triggerCloudPush();
  }, [actorUserId, companyId, triggerCloudPush, triggerSave]);

  useEffect(() => {
    if (!enabled) {
      registerSyncHandler(null);
      return;
    }
    registerSyncHandler(syncNow);
    return () => registerSyncHandler(null);
  }, [enabled, registerSyncHandler, syncNow]);
}
