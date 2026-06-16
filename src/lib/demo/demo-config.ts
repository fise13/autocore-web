/** Shared demo company id (Firestore). */
export const DEMO_COMPANY_ID = "demo-autocore";

/** Shared demo account email (public — used in UI copy). */
export const DEMO_ACCOUNT_EMAIL =
  process.env.NEXT_PUBLIC_DEMO_EMAIL?.trim() ||
  process.env.DEMO_ACCOUNT_EMAIL?.trim() ||
  "demo@autocore.app";

export function isDemoConfigured(): boolean {
  return Boolean(process.env.DEMO_ACCOUNT_PASSWORD?.trim());
}

export function isDemoAccountEmail(email: string | null | undefined): boolean {
  if (!email) return false;
  return email.trim().toLowerCase() === DEMO_ACCOUNT_EMAIL.toLowerCase();
}

export function isDemoSession(input: {
  email?: string | null;
  companyId?: string | null;
}): boolean {
  return input.companyId === DEMO_COMPANY_ID || isDemoAccountEmail(input.email);
}
