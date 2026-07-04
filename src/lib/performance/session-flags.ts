const AUTH_SESSION_KEY = "autocore-auth-session";
const WIZARD_COMPLETED_PREFIX = "autocore-wizard-completed:";
const EMAIL_VERIFIED_PREFIX = "autocore-email-verified:";

export function markAuthSessionSeen(): void {
  if (typeof window === "undefined") return;
  sessionStorage.setItem(AUTH_SESSION_KEY, "1");
}

export function hasSeenAuthSession(): boolean {
  if (typeof window === "undefined") return false;
  return sessionStorage.getItem(AUTH_SESSION_KEY) === "1";
}

export function markWizardCompleted(companyId: string): void {
  if (typeof window === "undefined" || !companyId) return;
  sessionStorage.setItem(`${WIZARD_COMPLETED_PREFIX}${companyId}`, "1");
}

export function hasWizardCompleted(companyId: string): boolean {
  if (typeof window === "undefined" || !companyId) return false;
  return sessionStorage.getItem(`${WIZARD_COMPLETED_PREFIX}${companyId}`) === "1";
}

const MIGRATION_OFFER_PREFIX = "autocore-migration-offered:";

/** Survives full reloads and browser restarts (unlike wizard session flags). */
export function markMigrationOfferCompleted(companyId: string): void {
  if (typeof window === "undefined" || !companyId) return;
  const key = `${MIGRATION_OFFER_PREFIX}${companyId}`;
  try {
    localStorage.setItem(key, "1");
  } catch {
    // Fall back when storage is unavailable (private mode quotas, etc.).
  }
  // Keep session copy so in-tab reads stay consistent with older builds.
  try {
    sessionStorage.setItem(key, "1");
  } catch {
    // Ignore.
  }
}

export function hasMigrationOfferCompleted(companyId: string): boolean {
  if (typeof window === "undefined" || !companyId) return false;
  const key = `${MIGRATION_OFFER_PREFIX}${companyId}`;
  try {
    if (localStorage.getItem(key) === "1") return true;
  } catch {
    // Ignore.
  }
  try {
    return sessionStorage.getItem(key) === "1";
  } catch {
    return false;
  }
}

export function markEmailVerificationComplete(uid: string): void {
  if (typeof window === "undefined" || !uid) return;
  sessionStorage.setItem(`${EMAIL_VERIFIED_PREFIX}${uid}`, "1");
}

export function hasEmailVerificationComplete(uid: string): boolean {
  if (typeof window === "undefined" || !uid) return false;
  return sessionStorage.getItem(`${EMAIL_VERIFIED_PREFIX}${uid}`) === "1";
}

export function clearEmailVerificationComplete(uid: string): void {
  if (typeof window === "undefined" || !uid) return;
  sessionStorage.removeItem(`${EMAIL_VERIFIED_PREFIX}${uid}`);
}
