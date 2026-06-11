const INVITE_TOKEN_STORAGE_KEY = "autocore-invite-token";

export function storeInviteToken(token: string) {
  if (typeof sessionStorage === "undefined") return;
  sessionStorage.setItem(INVITE_TOKEN_STORAGE_KEY, token.trim());
}

export function readInviteToken(): string | null {
  if (typeof sessionStorage === "undefined") return null;
  return sessionStorage.getItem(INVITE_TOKEN_STORAGE_KEY);
}

export function clearInviteToken() {
  if (typeof sessionStorage === "undefined") return;
  sessionStorage.removeItem(INVITE_TOKEN_STORAGE_KEY);
}
