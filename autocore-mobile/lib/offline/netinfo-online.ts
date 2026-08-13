/**
 * How to read NetInfo without lying about leaving the app.
 *
 * On iOS, `NWPathMonitor` often reports `isConnected: false` (or
 * `isInternetReachable: false`) the moment the process hits `inactive` /
 * `background` — Control Center, the app switcher, the Lock Screen, even
 * just switching away. The radios are still up. Treating that as offline
 * parks the intake queue, disables Firestore, and paints "Offline" on the
 * home screen and Dynamic Island.
 *
 * Even in the foreground, `isInternetReachable: false` while Wi‑Fi/cellular
 * icons are lit is common (captive-portal probes, brief DNS). Trusting that
 * flag alone parked Warehouse sync under a live Wi‑Fi icon.
 *
 * Pure — no React Native import — so the node test runner can load it.
 */

export type NetInfoLike = {
  isConnected?: boolean | null;
  isInternetReachable?: boolean | null;
};

/** Default grace before a foreground disconnect becomes committed offline. */
export const OFFLINE_COMMIT_GRACE_MS = 5_000;

/**
 * Link up = online for our purposes.
 *
 * We deliberately ignore `isInternetReachable`. A false reachability probe
 * must not park the outbox or paint the Offline banner.
 */
export function netInfoSaysOnline(net: NetInfoLike): boolean {
  return Boolean(net.isConnected);
}

export type CommittedOnlineResult = {
  online: boolean;
  /** Wall-clock when a foreground offline candidate started; null when clear. */
  offlineCandidateSinceMs: number | null;
};

/**
 * Commit a connectivity reading.
 *
 * - Background/inactive: never flip *to* offline (iOS NetInfo lies then).
 * - Foreground: ignore reachability; require a sustained `isConnected: false`
 *   for `offlineGraceMs` before committing offline, so a one-sample blip
 *   does not freeze intake sync.
 */
export function resolveCommittedOnline(input: {
  net: NetInfoLike;
  appState: string;
  lastOnline: boolean;
  nowMs?: number;
  offlineCandidateSinceMs?: number | null;
  offlineGraceMs?: number;
}): CommittedOnlineResult {
  const now = input.nowMs ?? Date.now();
  const grace = input.offlineGraceMs ?? OFFLINE_COMMIT_GRACE_MS;
  const reading = netInfoSaysOnline(input.net);

  if (input.appState !== 'active') {
    return {
      online: reading || input.lastOnline,
      offlineCandidateSinceMs: null,
    };
  }

  if (reading) {
    return { online: true, offlineCandidateSinceMs: null };
  }

  const since = input.offlineCandidateSinceMs ?? now;
  if (input.lastOnline && now - since < grace) {
    return { online: true, offlineCandidateSinceMs: since };
  }

  return { online: false, offlineCandidateSinceMs: since };
}
