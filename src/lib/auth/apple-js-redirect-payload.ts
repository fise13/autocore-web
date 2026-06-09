export const APPLE_REDIRECT_PAYLOAD_KEY = "autocore.appleRedirectPayload";

export type AppleRedirectPayload = {
  id_token: string;
  code?: string;
  state?: string;
  user?: unknown;
};

export function parseAppleRedirectFormEntry(value: FormDataEntryValue | null): string | undefined {
  if (value == null) return undefined;
  const text = String(value).trim();
  return text || undefined;
}

export function parseAppleRedirectUserField(value: FormDataEntryValue | null): unknown {
  const text = parseAppleRedirectFormEntry(value);
  if (!text) return undefined;
  try {
    return JSON.parse(text) as unknown;
  } catch {
    return text;
  }
}

export function buildAppleRedirectPayload(formData: FormData): AppleRedirectPayload | null {
  const id_token = parseAppleRedirectFormEntry(formData.get("id_token"));
  if (!id_token) return null;

  return {
    id_token,
    code: parseAppleRedirectFormEntry(formData.get("code")),
    state: parseAppleRedirectFormEntry(formData.get("state")),
    user: parseAppleRedirectUserField(formData.get("user")),
  };
}
