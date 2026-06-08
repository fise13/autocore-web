/** Shared demo account email (public — used in UI copy). */
export const DEMO_ACCOUNT_EMAIL =
  process.env.NEXT_PUBLIC_DEMO_EMAIL?.trim() ||
  process.env.DEMO_ACCOUNT_EMAIL?.trim() ||
  "demo@autocore.app";

export function isDemoConfigured(): boolean {
  return Boolean(process.env.DEMO_ACCOUNT_PASSWORD?.trim());
}
