import * as AppleAuthentication from 'expo-apple-authentication';
import { updateProfile, type User } from 'firebase/auth';
import { Platform } from 'react-native';

import { createRandomNonce, sha256NonceHex } from '@/lib/auth/apple-nonce';
import { formatAppleNativeErrorForUi } from '@/lib/auth/apple-native-setup';
import { exchangeAppleSignInViaApi } from '@/services/api/apple-sign-in';
import { signInWithFirebaseCustomToken } from '@/services/firebase/auth';

export async function isAppleSignInAvailable(): Promise<boolean> {
  if (Platform.OS !== 'ios') return false;
  try {
    return await AppleAuthentication.isAvailableAsync();
  } catch {
    return false;
  }
}

async function applyAppleProfileFromCredential(
  user: User,
  credential: AppleAuthentication.AppleAuthenticationCredential,
): Promise<User> {
  const givenName = credential.fullName?.givenName?.trim();
  const familyName = credential.fullName?.familyName?.trim();
  const fullName = [givenName, familyName].filter(Boolean).join(' ').trim();

  if (fullName && !user.displayName?.trim()) {
    try {
      await updateProfile(user, { displayName: fullName });
      await user.reload();
    } catch {
      // Non-fatal — profile journey can collect the name later.
    }
  }

  return user;
}

function buildAppleApiPayload(
  credential: AppleAuthentication.AppleAuthenticationCredential,
  rawNonce: string,
) {
  const givenName = credential.fullName?.givenName?.trim();
  const familyName = credential.fullName?.familyName?.trim();
  const fullName = [givenName, familyName].filter(Boolean).join(' ').trim() || null;

  return {
    idToken: credential.identityToken!,
    rawNonce,
    authorizationCode: credential.authorizationCode ?? null,
    email: credential.email?.trim() || null,
    fullName,
  };
}

async function completeAppleFirebaseSignIn(
  credential: AppleAuthentication.AppleAuthenticationCredential,
  rawNonce: string,
): Promise<User> {
  if (!credential.identityToken) {
    throw new Error('Apple did not return an identity token. Check Sign in with Apple in Apple Developer.');
  }

  // Native iOS hashes the nonce inside the identity token (base64url).
  // Firebase JS on-device compares hex and fails — exchange via server instead.
  const customToken = await exchangeAppleSignInViaApi(buildAppleApiPayload(credential, rawNonce));
  const user = await signInWithFirebaseCustomToken(customToken);
  return applyAppleProfileFromCredential(user, credential);
}

export type AppleNativeSignInResult = {
  user: User;
  /**
   * Single-use code Apple issues alongside the identity token. Account deletion
   * spends it on `/auth/revoke`; it expires within minutes, so it is only good
   * for the request that immediately follows this sign-in.
   */
  authorizationCode: string | null;
};

/**
 * Full native Sign in with Apple, exposing the raw authorization code.
 *
 * Account deletion needs the code to revoke the Apple grant, and needs the
 * whole sign-in — not `reauthenticateWithCredential` — because the on-device
 * Firebase JS credential path fails the nonce check on native iOS, which is the
 * same reason the sign-in flow above goes through the server.
 */
export async function signInWithAppleNativeDetailed(): Promise<AppleNativeSignInResult> {
  if (Platform.OS !== 'ios') {
    throw new Error('Sign in with Apple is only available on iPhone and iPad.');
  }

  const available = await isAppleSignInAvailable();
  if (!available) {
    throw new Error('Sign in with Apple is not available on this device.');
  }

  const rawNonce = createRandomNonce();
  // Expo SDK 56 passes nonce to ASAuthorizationAppleIDRequest as-is (no auto-hash).
  const hashedNonce = await sha256NonceHex(rawNonce);

  let credential: AppleAuthentication.AppleAuthenticationCredential;
  try {
    credential = await AppleAuthentication.signInAsync({
      requestedScopes: [
        AppleAuthentication.AppleAuthenticationScope.FULL_NAME,
        AppleAuthentication.AppleAuthenticationScope.EMAIL,
      ],
      nonce: hashedNonce,
    });
  } catch (error) {
    if (isAppleSignInCancellation(error)) throw error;
    const uiMessage = formatAppleNativeErrorForUi(error);
    if (uiMessage) {
      throw new Error(uiMessage);
    }
    throw error;
  }

  const user = await completeAppleFirebaseSignIn(credential, rawNonce);
  return { user, authorizationCode: credential.authorizationCode ?? null };
}

export async function signInWithAppleNative(): Promise<User> {
  const { user } = await signInWithAppleNativeDetailed();
  return user;
}

export function isAppleSignInCancellation(error: unknown): boolean {
  if (typeof error === 'object' && error !== null && 'code' in error) {
    const code = String((error as { code?: string }).code);
    return code === 'ERR_REQUEST_CANCELED' || code === 'ERR_CANCELED';
  }
  return error instanceof Error && /canceled|cancelled/i.test(error.message);
}
