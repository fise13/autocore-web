/**
 * The one shared login of the Motor Land document desk (docs.myautocore.com).
 *
 * The counter staff share a single account, checked as HTTP Basic auth in the
 * middleware before the page or its API is served. The credentials come from
 * `MOTOR_LAND_DOCS_USER` / `MOTOR_LAND_DOCS_PASSWORD`; with either unset the
 * desk stays locked rather than open.
 *
 * ponytail: no rate limit on guesses. Add one (or move to real sign-in) if the
 * desk ever needs more than a shop-counter password.
 */

export function isMotorLandDesk(host: string, pathname: string): boolean {
  return (
    host.startsWith("docs.") ||
    pathname.startsWith("/docs/motor-sale") ||
    pathname.startsWith("/api/motor-land")
  );
}

async function sha256(value: string): Promise<string> {
  const bytes = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(value));
  return Array.from(new Uint8Array(bytes), (byte) => byte.toString(16).padStart(2, "0")).join("");
}

/** Compares digests, not the raw strings, so the timing says nothing about the password. */
export async function isValidDeskLogin(
  authorization: string | null,
  user: string | undefined,
  password: string | undefined,
): Promise<boolean> {
  if (!user || !password || !authorization?.startsWith("Basic ")) return false;

  let given: string;
  try {
    given = atob(authorization.slice("Basic ".length).trim());
  } catch {
    return false;
  }
  return (await sha256(given)) === (await sha256(`${user}:${password}`));
}
