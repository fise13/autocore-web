export const PLATFORM_SYNC_STEPS = ["idle", "scan", "detect", "save", "sync", "live"] as const;

export type PlatformSyncStep = (typeof PLATFORM_SYNC_STEPS)[number];

export const PLATFORM_SYNC_INTERVAL_MS = 2600;

export function platformStepIndex(step: PlatformSyncStep): number {
  return PLATFORM_SYNC_STEPS.indexOf(step);
}

export function isPlatformStepAtLeast(step: PlatformSyncStep, target: PlatformSyncStep): boolean {
  return platformStepIndex(step) >= platformStepIndex(target);
}
