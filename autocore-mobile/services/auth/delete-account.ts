import * as AppleAuthentication from 'expo-apple-authentication';
import * as Crypto from 'expo-crypto';
import { Platform } from 'react-native';
import type { User } from 'firebase/auth';

import { isAppleSignInCancellation } from '@/services/auth/apple-sign-in';
import { mapNativeGoogleSignInError, signInWithGoogleNative } from '@/services/auth/google-sign-in';
import {
  deleteCurrentAuthUser,
  getAuthProviderIds,
  reauthenticateWithAppleIdentityToken,
  reauthenticateWithGoogleIdToken,
  reauthenticateWithPassword,
} from '@/services/firebase/auth';
import { deleteUserAccountData } from '@/services/firebase/profile';

export type DeleteAccountInput = {
  /** Required when the account uses email/password. */
  password?: string;
};

function isCancelled(error: unknown): boolean {
  if (isAppleSignInCancellation(error)) return true;
  if (typeof error === 'object' && error && 'code' in error) {
    const code = String((error as { code?: string }).code);
    return code === 'auth/cancelled' || code === 'ERR_REQUEST_CANCELED' || code === 'ERR_CANCELED';
  }
  return error instanceof Error && /cancel/i.test(error.message);
}

async function reauthenticateForDeletion(user: User, password?: string): Promise<void> {
  const providers = getAuthProviderIds(user);

  if (providers.includes('password')) {
    const pwd = password?.trim();
    if (!pwd) {
      throw Object.assign(new Error('Enter your current password to delete this account.'), {
        code: 'auth/password-required',
      });
    }
    await reauthenticateWithPassword(user, pwd);
    return;
  }

  if (providers.includes('google.com')) {
    try {
      const idToken = await signInWithGoogleNative();
      await reauthenticateWithGoogleIdToken(user, idToken);
    } catch (error) {
      throw mapNativeGoogleSignInError(error);
    }
    return;
  }

  if (providers.includes('apple.com')) {
    if (Platform.OS !== 'ios') {
      throw new Error('Deleting an Apple account is only available on iPhone and iPad.');
    }
    const rawNonce = Crypto.randomUUID();
    const hashedNonce = await Crypto.digestStringAsync(Crypto.CryptoDigestAlgorithm.SHA256, rawNonce);
    const credential = await AppleAuthentication.signInAsync({
      requestedScopes: [],
      nonce: hashedNonce,
    });
    if (!credential.identityToken) {
      throw new Error('Apple did not return an identity token.');
    }
    await reauthenticateWithAppleIdentityToken(user, credential.identityToken, rawNonce);
    return;
  }

  throw new Error('Could not verify identity to delete this account.');
}

/**
 * Reauthenticates, cleans profile data, deletes Firebase Auth user.
 * Throws with code `auth/cancelled` when the user aborts OAuth confirmation.
 */
export async function deleteAccountForCurrentUser(
  user: User,
  input: DeleteAccountInput = {},
): Promise<void> {
  try {
    await reauthenticateForDeletion(user, input.password);
  } catch (error) {
    if (isCancelled(error)) {
      throw Object.assign(new Error('Deletion cancelled.'), { code: 'auth/cancelled' });
    }
    throw error;
  }

  await deleteUserAccountData(user);
  await deleteCurrentAuthUser(user);
}

export function accountUsesPassword(user: User | null | undefined): boolean {
  if (!user) return false;
  return getAuthProviderIds(user).includes('password');
}
