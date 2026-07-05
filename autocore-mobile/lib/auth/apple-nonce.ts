import * as Crypto from 'expo-crypto';

const NONCE_CHARSET = '0123456789ABCDEFGHIJKLMNOPQRSTUVXYZabcdefghijklmnopqrstuvwxyz-._';

/** Mirrors src/lib/auth/apple-nonce.ts (web Sign in with Apple). */
export function createRandomNonce(length = 32): string {
  const bytes = Crypto.getRandomBytes(length);
  return Array.from(bytes, (value) => NONCE_CHARSET[value % NONCE_CHARSET.length]).join('');
}

/** Web Apple JS — SHA-256 hex (Services ID flow). */
export async function sha256NonceHex(value: string): Promise<string> {
  const bytes = new TextEncoder().encode(value);
  const hash = await Crypto.digest(Crypto.CryptoDigestAlgorithm.SHA256, bytes);
  return Array.from(new Uint8Array(hash), (byte) => byte.toString(16).padStart(2, '0')).join('');
}

/** @deprecated Use sha256NonceHex — kept for imports. */
export async function sha256Nonce(value: string): Promise<string> {
  return sha256NonceHex(value);
}
