export function verifiedAppleEmail(payload: Record<string, unknown>): string | null {
  const email = typeof payload.email === "string" ? payload.email.trim().toLowerCase() : "";
  const emailVerified = payload.email_verified === true || payload.email_verified === "true";

  return email && emailVerified ? email : null;
}
