export const APPLE_REDIRECT_FLAG = "autocore.appleRedirect";

export function hasPendingAppleRedirect(): boolean {
  if (typeof window === "undefined") return false;
  return sessionStorage.getItem(APPLE_REDIRECT_FLAG) === "1";
}

export function markAppleRedirectPending() {
  if (typeof window === "undefined") return;
  sessionStorage.setItem(APPLE_REDIRECT_FLAG, "1");
}

export function clearAppleRedirectPending() {
  if (typeof window === "undefined") return;
  sessionStorage.removeItem(APPLE_REDIRECT_FLAG);
}
