const INVITE_ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789abcdefghjkmnpqrstuvwxyz";

export function generateInviteToken(length = 32): string {
  const bytes = new Uint8Array(length);
  if (typeof crypto !== "undefined" && crypto.getRandomValues) {
    crypto.getRandomValues(bytes);
  } else {
    for (let index = 0; index < length; index += 1) {
      bytes[index] = Math.floor(Math.random() * 256);
    }
  }
  let token = "";
  for (let index = 0; index < length; index += 1) {
    token += INVITE_ALPHABET[bytes[index]! % INVITE_ALPHABET.length];
  }
  return token;
}
