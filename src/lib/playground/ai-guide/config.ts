/**
 * Isolated AI Guide playground company.
 *
 * Lives in the same Firebase project as Live/Demo, but is a distinct tenant.
 * Isolation is companyId partitioning — the same model Live uses — plus
 * hard-coded wipe/provision targets that never accept a caller-supplied id.
 */

export const AI_GUIDE_COMPANY_ID = "ai-guide-playground";

export const AI_GUIDE_ACCOUNT_EMAIL =
  process.env.NEXT_PUBLIC_AI_GUIDE_EMAIL?.trim() ||
  process.env.AI_GUIDE_ACCOUNT_EMAIL?.trim() ||
  "guide@playground.autocore.app";

export const AI_GUIDE_OWNER_NAME = "Jordan Hale";
export const AI_GUIDE_COMPANY_NAME = "Ridgeway Performance";
export const AI_GUIDE_COMPANY_LEGAL_NAME = "Ridgeway Performance Engines LLC";
export const AI_GUIDE_COMPANY_SHORT_NAME = "Ridgeway";
export const AI_GUIDE_COMPANY_SLOGAN = "JDM engines, built to run.";
export const AI_GUIDE_COMPANY_PHONE = "+1 503 555 0148";
export const AI_GUIDE_COMPANY_EMAIL = "shop@ridgeway.example";
export const AI_GUIDE_COMPANY_ADDRESS = "814 N Killingsworth St, Portland, OR 97217";
export const AI_GUIDE_COMPANY_WEBSITE = "https://ridgeway.example";
export const AI_GUIDE_LOGO_PATH = "/ai-guide-playground/logo.svg";

export const AI_GUIDE_SESSION_KEY = "autocore.ai-guide-playground";

export function isAiGuideAccountEmail(email: string | null | undefined): boolean {
  if (!email) return false;
  return email.trim().toLowerCase() === AI_GUIDE_ACCOUNT_EMAIL.toLowerCase();
}

export function isAiGuideCompanyId(companyId: string | null | undefined): boolean {
  return companyId === AI_GUIDE_COMPANY_ID;
}

export function isAiGuideSession(input: {
  email?: string | null;
  companyId?: string | null;
}): boolean {
  return isAiGuideCompanyId(input.companyId) || isAiGuideAccountEmail(input.email);
}
