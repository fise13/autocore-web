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
 * Pure — no React Native import — so the node test runner can load it.
 */

export type NetInfoLike = {
  isConnected?: boolean | null;
  isInternetReachable?: boolean | null;
};

export function netInfoSaysOnline(net: NetInfoLike): boolean {
  return Boolean(net.isConnected) && net.isInternetReachable !== false;
}

/**
 * Commit a connectivity reading.
 *
 * While the app is not in the foreground, never flip *to* offline. A true
 * "online" reading is still accepted so a reconnect can stick. Callers pass
 * the last committed value.
 */
export function resolveCommittedOnline(input: {
  net: NetInfoLike;
  appState: string;
  lastOnline: boolean;
}): boolean {
  const reading = netInfoSaysOnline(input.net);
  if (input.appState !== 'active') {
    return reading || input.lastOnline;
  }
  return reading;
}
