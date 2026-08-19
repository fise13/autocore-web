import { useSyncExternalStore } from 'react';

import { getMsSinceLastCatalogApply, getPendingQueryDataApplyCount, hasSeenCatalogApply } from '@/lib/realtime/query-data-scheduler';
import { getSessionBootstrapStatus, subscribeRealtimeRegistry } from '@/lib/realtime/subscription-registry';
import { prepareSyncAuth } from '@/services/firebase/prepare-sync-auth';
import { switchActiveCompany } from '@/services/firestore/company-membership-service';
import { NotificationService } from '@/services/notifications';

export type CompanySwitchState = {
  companyId: string;
  name: string;
} | null;

let switching: CompanySwitchState = null;
const listeners = new Set<() => void>();

function emit() {
  for (const listener of listeners) {
    listener();
  }
}

export function getCompanySwitchState(): CompanySwitchState {
  return switching;
}

export function subscribeCompanySwitch(listener: () => void): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

export function useCompanySwitchState(): CompanySwitchState {
  return useSyncExternalStore(subscribeCompanySwitch, getCompanySwitchState, getCompanySwitchState);
}

const WORKSPACE_READY_QUIET_MS = 60;
const WORKSPACE_READY_TIMEOUT_MS = 2800;
const WORKSPACE_READY_POLL_MS = 50;

async function waitForWorkspaceReady(companyId: string): Promise<void> {
  const startedAt = Date.now();

  await new Promise<void>((resolve) => {
    let pollTimer: ReturnType<typeof setTimeout> | null = null;
    let cancelled = false;

    const finish = () => {
      if (cancelled) return;
      cancelled = true;
      if (pollTimer) clearTimeout(pollTimer);
      clearTimeout(failsafe);
      unsubscribe();
      resolve();
    };

    const tick = () => {
      if (cancelled) return;

      const elapsed = Date.now() - startedAt;
      const bootstrap = getSessionBootstrapStatus(companyId);
      const pendingApplies = getPendingQueryDataApplyCount();
      const catalogQuiet =
        !hasSeenCatalogApply() ||
        (pendingApplies === 0 && getMsSinceLastCatalogApply() >= WORKSPACE_READY_QUIET_MS);

      if (elapsed >= WORKSPACE_READY_TIMEOUT_MS || (bootstrap.ready && catalogQuiet)) {
        finish();
        return;
      }

      pollTimer = setTimeout(tick, WORKSPACE_READY_POLL_MS);
    };

    const unsubscribe = subscribeRealtimeRegistry(tick);
    const failsafe = setTimeout(finish, WORKSPACE_READY_TIMEOUT_MS + 120);
    tick();
  });
}

export type RunCompanySwitchArgs = {
  userId: string;
  companyId: string;
  companyName: string;
  refreshProfile: () => Promise<void>;
  /** Re-auth Firestore rules cache — used when leaving the org picker. */
  prepareSync?: boolean;
};

/**
 * Switch workspace with a global loading overlay until profile + inbox sync settle.
 */
export async function runCompanySwitch({
  userId,
  companyId,
  companyName,
  refreshProfile,
  prepareSync = false,
}: RunCompanySwitchArgs): Promise<void> {
  if (switching) return;

  switching = { companyId, name: companyName };
  emit();

  try {
    await switchActiveCompany(userId, companyId);
    if (prepareSync) {
      await prepareSyncAuth(userId, { force: true });
    }
    await refreshProfile();
    await NotificationService.syncInbox();
    await waitForWorkspaceReady(companyId);
  } finally {
    switching = null;
    emit();
  }
}
