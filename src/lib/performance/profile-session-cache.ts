import type { UserEntity } from "@/domain/user";

const PROFILE_CACHE_PREFIX = "autocore-profile-snapshot:";

export function readCachedProfile(uid: string): UserEntity | null {
  if (typeof window === "undefined" || !uid) return null;
  try {
    const raw = sessionStorage.getItem(`${PROFILE_CACHE_PREFIX}${uid}`);
    if (!raw) return null;
    return JSON.parse(raw) as UserEntity;
  } catch {
    return null;
  }
}

export function writeCachedProfile(uid: string, profile: UserEntity): void {
  if (typeof window === "undefined" || !uid) return;
  try {
    sessionStorage.setItem(`${PROFILE_CACHE_PREFIX}${uid}`, JSON.stringify(profile));
  } catch {
    // Quota or private mode — ignore.
  }
}

export function clearCachedProfile(uid?: string): void {
  if (typeof window === "undefined") return;
  if (!uid) return;
  sessionStorage.removeItem(`${PROFILE_CACHE_PREFIX}${uid}`);
}
