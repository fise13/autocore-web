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

export function markMigrationOfferCompleted(companyId: string): void {
  if (typeof window === "undefined" || !companyId) return;
  sessionStorage.setItem(`${MIGRATION_OFFER_PREFIX}${companyId}`, "1");
}

export function hasMigrationOfferCompleted(companyId: string): boolean {
  if (typeof window === "undefined" || !companyId) return false;
  return sessionStorage.getItem(`${MIGRATION_OFFER_PREFIX}${companyId}`) === "1";
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
