import { getFirebaseAuth } from "@/infrastructure/firebase/client";
import { ensureRbacBootstrap } from "@/infrastructure/firestore/rbac-bootstrap";

const bootstrappedUids = new Set<string>();
let lastTokenRefreshAt = 0;
const TOKEN_REFRESH_INTERVAL_MS = 10 * 60 * 1000;

export function resetSyncAuthCache(uid?: string): void {
  if (uid) {
    bootstrappedUids.delete(uid);
    return;
  }
  bootstrappedUids.clear();
  lastTokenRefreshAt = 0;
}

/** Full auth prep — use on login or after permission errors only. */
export async function prepareSyncAuth(uid: string, options?: { force?: boolean }): Promise<void> {
  const auth = getFirebaseAuth();
  const user = auth.currentUser;
  if (!user || user.uid !== uid) return;

  if (!bootstrappedUids.has(uid)) {
    try {
      await ensureRbacBootstrap(uid);
    } catch (error) {
      console.warn("RBAC bootstrap failed during sync:", error);
    }
    bootstrappedUids.add(uid);
  }

  const force = options?.force ?? false;
  const stale = Date.now() - lastTokenRefreshAt > TOKEN_REFRESH_INTERVAL_MS;
  if (force || stale) {
    await user.getIdToken(force);
    lastTokenRefreshAt = Date.now();
  }
}

/** Mark session as bootstrapped after auth-provider refresh (avoids duplicate work on first save). */
export function markSyncAuthPrepared(uid: string): void {
  bootstrappedUids.add(uid);
}
