const NONCE_CHARSET = "0123456789ABCDEFGHIJKLMNOPQRSTUVXYZabcdefghijklmnopqrstuvwxyz-._";

export function createRandomNonce(length = 32): string {
  const values = crypto.getRandomValues(new Uint8Array(length));
  return Array.from(values, (value) => NONCE_CHARSET[value % NONCE_CHARSET.length]).join("");
}

export async function sha256Nonce(value: string): Promise<string> {
  const data = new TextEncoder().encode(value);
  const hash = await crypto.subtle.digest("SHA-256", data);
  return Array.from(new Uint8Array(hash), (byte) => byte.toString(16).padStart(2, "0")).join("");
}
