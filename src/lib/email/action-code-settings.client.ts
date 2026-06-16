import { getAppUrl } from "@/lib/site-urls";

/** Client-side Firebase Auth action settings (password reset, email verify). */
export function buildClientActionCodeSettings() {
  return {
    url: `${getAppUrl().replace(/\/$/, "")}/auth/action`,
    handleCodeInApp: true,
  };
}
