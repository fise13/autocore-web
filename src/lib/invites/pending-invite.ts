const INVITE_TOKEN_STORAGE_KEY = "autocore-invite-token";
const INVITE_EMAIL_STORAGE_KEY = "autocore-invite-email";
const INVITE_COMPANY_STORAGE_KEY = "autocore-invite-company";

function storage(): Storage | null {
  if (typeof window === "undefined") return null;
  try {
    return window.localStorage;
  } catch {
    return null;
  }
}

export function storeInviteToken(token: string) {
  storage()?.setItem(INVITE_TOKEN_STORAGE_KEY, token.trim());
}

export function storeInviteContext(params: { email: string; companyName?: string }) {
  storage()?.setItem(INVITE_EMAIL_STORAGE_KEY, params.email.trim().toLowerCase());
  if (params.companyName?.trim()) {
    storage()?.setItem(INVITE_COMPANY_STORAGE_KEY, params.companyName.trim());
  }
}

export function storePendingInvite(params: { token: string; email?: string; companyName?: string }) {
  storeInviteToken(params.token);
  if (params.email) {
    storeInviteContext({ email: params.email, companyName: params.companyName });
  }
}

export function readInviteToken(): string | null {
  return storage()?.getItem(INVITE_TOKEN_STORAGE_KEY) ?? null;
}

export function readInviteEmail(): string | null {
  return storage()?.getItem(INVITE_EMAIL_STORAGE_KEY) ?? null;
}

export function readInviteCompanyName(): string | null {
  return storage()?.getItem(INVITE_COMPANY_STORAGE_KEY) ?? null;
}

export function clearInviteToken() {
  const store = storage();
  store?.removeItem(INVITE_TOKEN_STORAGE_KEY);
  store?.removeItem(INVITE_EMAIL_STORAGE_KEY);
  store?.removeItem(INVITE_COMPANY_STORAGE_KEY);
}
