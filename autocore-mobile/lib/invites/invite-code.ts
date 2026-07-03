import * as Crypto from 'expo-crypto';

const INVITE_CODE_ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
const INVITE_TOKEN_ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789abcdefghjkmnpqrstuvwxyz';

function pickFromAlphabet(alphabet: string, length: number): string {
  const bytes = Crypto.getRandomBytes(length);
  let value = '';
  for (let index = 0; index < length; index += 1) {
    value += alphabet[bytes[index]! % alphabet.length];
  }
  return value;
}

export function generateInviteCode(length = 6): string {
  return pickFromAlphabet(INVITE_CODE_ALPHABET, length);
}

export function generateInviteToken(length = 32): string {
  return pickFromAlphabet(INVITE_TOKEN_ALPHABET, length);
}
