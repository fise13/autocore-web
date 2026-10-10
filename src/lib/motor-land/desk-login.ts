/**
 * The one shared login of the Motor Land document desk (docs.myautocore.com).
 *
 * The counter staff share a single account. `/docs/login` posts it to
 * `/api/motor-land/login`, which sets an HttpOnly cookie; the middleware checks
 * that cookie before the desk or its API is served. The credentials come from
 * `MOTOR_LAND_DOCS_USER` / `MOTOR_LAND_DOCS_PASSWORD`; with either unset the
 * desk stays locked rather than open. Changing the password signs every
 * counter out, because the cookie is derived from it.
 *
 * ponytail: no rate limit on guesses. Add one (or move to real sign-in) if the
 * desk ever needs more than a shop-counter password.
 */

export const DESK_COOKIE = "motor_land_desk";
export const DESK_COOKIE_MAX_AGE = 60 * 60 * 24 * 30;

/** Reachable without the cookie — otherwise nobody could sign in. */
const PUBLIC_PATHS = new Set([
  "/login",
  "/docs/login",
  "/api/motor-land/login",
  "/api/motor-land/logout",
]);

export function isMotorLandDesk(host: string, pathname: string): boolean {
  if (PUBLIC_PATHS.has(pathname)) return false;
  return (
    host.startsWith("docs.") ||
    pathname.startsWith("/docs/motor-sale") ||
    pathname.startsWith("/api/motor-land")
  );
}

/** Where the login form lives, and where it sends you back to, on each host. */
export function deskPaths(host: string): { login: string; desk: string } {
  return host.startsWith("docs.")
    ? { login: "/login", desk: "/" }
    : { login: "/docs/login", desk: "/docs/motor-sale" };
}

async function sha256(value: string): Promise<string> {
  const bytes = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(value));
  return Array.from(new Uint8Array(bytes), (byte) => byte.toString(16).padStart(2, "0")).join("");
}

/** The cookie value for the configured pair; null while the desk is unconfigured. */
export async function deskToken(
  user: string | undefined,
  password: string | undefined,
): Promise<string | null> {
  if (!user || !password) return null;
  // The login is an email: case and stray spaces are not part of it.
  return sha256(`motor-land-desk:${user.trim().toLowerCase()}:${password}`);
}

/**
 * Both sides are digests of the same length, so the comparison's timing says
 * nothing about the password.
 */
export async function isValidDeskLogin(
  givenUser: string,
  givenPassword: string,
  user: string | undefined,
  password: string | undefined,
): Promise<boolean> {
  const expected = await deskToken(user, password);
  if (!expected) return false;
  return (await deskToken(givenUser, givenPassword)) === expected;
}

export async function isValidDeskCookie(
  cookie: string | undefined,
  user: string | undefined,
  password: string | undefined,
): Promise<boolean> {
  const expected = await deskToken(user, password);
  return Boolean(expected && cookie === expected);
}
