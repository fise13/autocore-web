import * as AppleAuthentication from 'expo-apple-authentication';
import { updateProfile, type User } from 'firebase/auth';
import { Platform } from 'react-native';

import { createRandomNonce, sha256Nonce } from '@/lib/auth/apple-nonce';
import { formatAppleNativeErrorForUi } from '@/lib/auth/apple-native-setup';
import { getAuthErrorCode } from '@/utils/auth-error';
import { exchangeAppleSignInViaApi } from '@/services/api/apple-sign-in';
import { signInWithAppleIdentityToken, signInWithFirebaseCustomToken } from '@/services/firebase/auth';

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

async function completeAppleFirebaseSignIn(
  credential: AppleAuthentication.AppleAuthenticationCredential,
  rawNonce: string,
): Promise<User> {
  if (!credential.identityToken) {
    throw new Error('Apple не вернул identity token. Проверьте Sign in with Apple в Apple Developer.');
  }

  const givenName = credential.fullName?.givenName?.trim();
  const familyName = credential.fullName?.familyName?.trim();
  const fullName = [givenName, familyName].filter(Boolean).join(' ').trim() || null;
  const email = credential.email?.trim() || null;
  const apiPayload = {
    idToken: credential.identityToken,
    rawNonce,
    authorizationCode: credential.authorizationCode ?? null,
    email,
    fullName,
  };

  const preferServerExchange =
    process.env.EXPO_PUBLIC_USE_PROD_API?.trim().toLowerCase() === 'true';

  if (preferServerExchange) {
    const customToken = await exchangeAppleSignInViaApi(apiPayload);
    const user = await signInWithFirebaseCustomToken(customToken);
    return applyAppleProfileFromCredential(user, credential);
  }

  try {
    const user = await signInWithAppleIdentityToken(credential.identityToken, rawNonce);
    return applyAppleProfileFromCredential(user, credential);
  } catch (error) {
    if (getAuthErrorCode(error) !== 'auth/invalid-credential') {
      throw error;
    }

    const customToken = await exchangeAppleSignInViaApi(apiPayload);
    const user = await signInWithFirebaseCustomToken(customToken);
    return applyAppleProfileFromCredential(user, credential);
  }
}

export async function signInWithAppleNative(): Promise<User> {
  if (Platform.OS !== 'ios') {
    throw new Error('Вход через Apple доступен только на iPhone и iPad.');
  }

  const available = await isAppleSignInAvailable();
  if (!available) {
    throw new Error('Вход через Apple недоступен на этом устройстве.');
  }

  const rawNonce = createRandomNonce();
  const hashedNonce = await sha256Nonce(rawNonce);

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

  return completeAppleFirebaseSignIn(credential, rawNonce);
}

export function isAppleSignInCancellation(error: unknown): boolean {
  if (typeof error === 'object' && error !== null && 'code' in error) {
    const code = String((error as { code?: string }).code);
    return code === 'ERR_REQUEST_CANCELED' || code === 'ERR_CANCELED';
  }
  return error instanceof Error && /canceled|cancelled/i.test(error.message);
}
