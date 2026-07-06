import { getJson, remove, setJson } from '@/lib/storage/kv';

const INVITE_TOKEN_KEY = 'autocore-mobile:pending-invite-token';
const INVITE_EMAIL_KEY = 'autocore-mobile:pending-invite-email';
const INVITE_COMPANY_KEY = 'autocore-mobile:pending-invite-company';

export function storePendingInvite(params: {
  token: string;
  email?: string;
  companyName?: string;
}): void {
  setJson(INVITE_TOKEN_KEY, params.token.trim());
  if (params.email) {
    setJson(INVITE_EMAIL_KEY, params.email.trim().toLowerCase());
  }
  if (params.companyName?.trim()) {
    setJson(INVITE_COMPANY_KEY, params.companyName.trim());
  }
}

export function readInviteToken(): string | null {
  return getJson<string>(INVITE_TOKEN_KEY);
}

export function readInviteEmail(): string | null {
  return getJson<string>(INVITE_EMAIL_KEY);
}

export function readInviteCompanyName(): string | null {
  return getJson<string>(INVITE_COMPANY_KEY);
}

export function clearPendingInvite(): void {
  remove(INVITE_TOKEN_KEY);
  remove(INVITE_EMAIL_KEY);
  remove(INVITE_COMPANY_KEY);
}
