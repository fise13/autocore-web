const AUTH_SESSION_KEY = "autocore-auth-session";
const WIZARD_COMPLETED_PREFIX = "autocore-wizard-completed:";

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
