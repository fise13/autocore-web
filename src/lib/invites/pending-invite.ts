const INVITE_TOKEN_STORAGE_KEY = "autocore-invite-token";
const INVITE_EMAIL_STORAGE_KEY = "autocore-invite-email";
const INVITE_COMPANY_STORAGE_KEY = "autocore-invite-company";

export function storeInviteToken(token: string) {
  if (typeof sessionStorage === "undefined") return;
  sessionStorage.setItem(INVITE_TOKEN_STORAGE_KEY, token.trim());
}

export function storeInviteContext(params: { email: string; companyName?: string }) {
  if (typeof sessionStorage === "undefined") return;
  sessionStorage.setItem(INVITE_EMAIL_STORAGE_KEY, params.email.trim().toLowerCase());
  if (params.companyName?.trim()) {
    sessionStorage.setItem(INVITE_COMPANY_STORAGE_KEY, params.companyName.trim());
  }
}

export function storePendingInvite(params: { token: string; email?: string; companyName?: string }) {
  storeInviteToken(params.token);
  if (params.email) {
    storeInviteContext({ email: params.email, companyName: params.companyName });
  }
}

export function readInviteToken(): string | null {
  if (typeof sessionStorage === "undefined") return null;
  return sessionStorage.getItem(INVITE_TOKEN_STORAGE_KEY);
}

export function readInviteEmail(): string | null {
  if (typeof sessionStorage === "undefined") return null;
  return sessionStorage.getItem(INVITE_EMAIL_STORAGE_KEY);
}

export function readInviteCompanyName(): string | null {
  if (typeof sessionStorage === "undefined") return null;
  return sessionStorage.getItem(INVITE_COMPANY_STORAGE_KEY);
}

export function clearInviteToken() {
  if (typeof sessionStorage === "undefined") return;
  sessionStorage.removeItem(INVITE_TOKEN_STORAGE_KEY);
  sessionStorage.removeItem(INVITE_EMAIL_STORAGE_KEY);
  sessionStorage.removeItem(INVITE_COMPANY_STORAGE_KEY);
}
