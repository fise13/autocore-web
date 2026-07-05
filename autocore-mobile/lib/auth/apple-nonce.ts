import * as Crypto from 'expo-crypto';

const NONCE_CHARSET = '0123456789ABCDEFGHIJKLMNOPQRSTUVXYZabcdefghijklmnopqrstuvwxyz-._';

/** Mirrors src/lib/auth/apple-nonce.ts (web Sign in with Apple). */
export function createRandomNonce(length = 32): string {
  const bytes = Crypto.getRandomBytes(length);
  return Array.from(bytes, (value) => NONCE_CHARSET[value % NONCE_CHARSET.length]).join('');
}

export async function sha256Nonce(value: string): Promise<string> {
  return Crypto.digestStringAsync(Crypto.CryptoDigestAlgorithm.SHA256, value);
}
