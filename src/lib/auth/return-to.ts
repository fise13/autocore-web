/**
 * Destination hand-off across the login screen.
 *
 * A deep link that lands on the web while signed out has to survive the trip
 * through `/login` — otherwise `myautocore.com/work-orders/123` silently turns
 * into the dashboard, which is exactly the fallback Universal Links depend on.
 *
 * The destination travels as a `?next=` query value and is re-validated on the
 * way out: only same-origin absolute paths are accepted, so a crafted
 * `?next=https://evil.example` cannot turn the login screen into an open
 * redirect.
 */

export const RETURN_TO_PARAM = "next";

/** Where a signed-in user goes when there is no saved destination. */
export const DEFAULT_POST_LOGIN_PATH = "/home";

/** Paths that must never be a post-login destination — they would loop. */
const NON_DESTINATION_PREFIXES = ["/login", "/auth", "/demo", "/deck", "/api"];

function isLoopingDestination(pathname: string): boolean {
  return NON_DESTINATION_PREFIXES.some(
    (prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`),
  );
}

/**
 * Accepts only a relative, same-origin path. Rejects absolute URLs,
 * protocol-relative `//host` (which browsers treat as absolute), backslash
 * variants, and control characters.
 */
export function sanitizeReturnTo(value: string | null | undefined): string | null {
  if (!value) return null;

  const raw = value.trim();
  if (!raw || raw.length > 2048) return null;
  if (/[\u0000-\u001f\u007f]/.test(raw)) return null;
  if (!raw.startsWith("/")) return null;
  if (raw.startsWith("//") || raw.startsWith("/\\")) return null;

  let url: URL;
  try {
    // A dummy base keeps parsing local: any absolute URL would have been
    // rejected above, so `url.pathname` here is always the caller's path.
    url = new URL(raw, "https://autocore.invalid");
  } catch {
    return null;
  }

  if (isLoopingDestination(url.pathname)) return null;

  return `${url.pathname}${url.search}${url.hash}`;
}

/** Current location → the `?next=` value to carry into `/login`. */
export function buildLoginUrl(destination: string | null | undefined): string {
  const safe = sanitizeReturnTo(destination);
  if (!safe || safe === DEFAULT_POST_LOGIN_PATH || safe === "/") return "/login";
  return `/login?${RETURN_TO_PARAM}=${encodeURIComponent(safe)}`;
}

/** `?next=` value → the path to navigate to after a successful sign-in. */
export function resolvePostLoginPath(value: string | null | undefined): string {
  return sanitizeReturnTo(value) ?? DEFAULT_POST_LOGIN_PATH;
}
