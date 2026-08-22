export const APP_SESSION_COOKIE = "autocore_auth";

const ONE_YEAR_SECONDS = 60 * 60 * 24 * 365;

/** Hint for edge middleware: a returning signed-in browser likely has this cookie set. */
export function hasAppSessionCookie(cookieValue: string | undefined): boolean {
  return cookieValue === "1";
}

export function setAppSessionCookie(): void {
  if (typeof document === "undefined") return;
  const secure = window.location.protocol === "https:" ? "; Secure" : "";
  document.cookie = `${APP_SESSION_COOKIE}=1; Path=/; Max-Age=${ONE_YEAR_SECONDS}; SameSite=Lax${secure}`;
}

export function clearAppSessionCookie(): void {
  if (typeof document === "undefined") return;
  const secure = window.location.protocol === "https:" ? "; Secure" : "";
  document.cookie = `${APP_SESSION_COOKIE}=; Path=/; Max-Age=0; SameSite=Lax${secure}`;
}
