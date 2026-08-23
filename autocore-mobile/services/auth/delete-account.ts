import { Platform } from 'react-native';
import type { User } from 'firebase/auth';

import { isAppleSignInCancellation, signInWithAppleNativeDetailed } from '@/services/auth/apple-sign-in';
import { mapNativeGoogleSignInError, signInWithGoogleNative } from '@/services/auth/google-sign-in';
import { revokeAppleGrantViaApi } from '@/services/api/apple-revoke';
import {
  deleteCurrentAuthUser,
  getAuthProviderIds,
  reauthenticateWithGoogleIdToken,
  reauthenticateWithPassword,
} from '@/services/firebase/auth';
import { getFirebaseAuth } from '@/services/firebase';
import {
  accountDataCleanupIsComplete,
  deleteUserAccountData,
  type AccountDataCleanupReport,
} from '@/services/firebase/profile';

export type DeleteAccountInput = {
  /** Required when the account uses email/password. */
  password?: string;
};

export type DeleteAccountResult = {
  /** False when some Firestore data survived — the account itself is gone either way. */
  dataFullyRemoved: boolean;
  cleanup: AccountDataCleanupReport;
  /**
   * Whether the Sign in with Apple grant was revoked. `not-applicable` for
   * accounts that never used Apple.
   */
  appleRevocation: 'revoked' | 'not-configured' | 'failed' | 'not-applicable';
};

function isCancelled(error: unknown): boolean {
  if (isAppleSignInCancellation(error)) return true;
  if (typeof error === 'object' && error && 'code' in error) {
    const code = String((error as { code?: string }).code);
    return code === 'auth/cancelled' || code === 'ERR_REQUEST_CANCELED' || code === 'ERR_CANCELED';
  }
  return error instanceof Error && /cancel/i.test(error.message);
}

function errorCode(error: unknown): string {
  if (typeof error === 'object' && error && 'code' in error) {
    return String((error as { code?: string }).code ?? '');
  }
  return '';
}

type ReauthResult = {
  /**
   * The user to delete. Apple re-signs in rather than re-authenticating, so the
   * caller must use this instance instead of the one it started with.
   */
  user: User;
  /** Fresh Apple authorization code, when the account signs in with Apple. */
  appleAuthorizationCode: string | null;
};

/**
 * Proves the person at the device owns this account.
 *
 * Firebase requires a recent login before `deleteUser`, and it is also the only
 * thing standing between a borrowed unlocked phone and a permanently destroyed
 * account.
 */
async function reauthenticateForDeletion(user: User, password?: string): Promise<ReauthResult> {
  const providers = getAuthProviderIds(user);

  if (providers.includes('password')) {
    const pwd = password?.trim();
    if (!pwd) {
      throw Object.assign(new Error('Enter your current password to delete this account.'), {
        code: 'auth/password-required',
      });
    }
    await reauthenticateWithPassword(user, pwd);
    return { user, appleAuthorizationCode: null };
  }

  if (providers.includes('google.com')) {
    try {
      const idToken = await signInWithGoogleNative();
      // Firebase refuses a credential belonging to a different account
      // (`auth/user-mismatch`), so picking the wrong Google account here fails
      // loudly instead of deleting someone else's data.
      await reauthenticateWithGoogleIdToken(user, idToken);
    } catch (error) {
      if (isCancelled(error)) throw error;
      throw mapNativeGoogleSignInError(error);
    }
    return { user, appleAuthorizationCode: null };
  }

  if (providers.includes('apple.com')) {
    if (Platform.OS !== 'ios') {
      throw new Error('Deleting an Apple account is only available on iPhone and iPad.');
    }

    // A full sign-in, not `reauthenticateWithCredential`: the on-device Firebase
    // JS credential path fails Apple's nonce check on native iOS (see
    // `apple-sign-in.ts`), so reauthenticating that way never succeeded here.
    const previousUid = user.uid;
    const { user: signedIn, authorizationCode } = await signInWithAppleNativeDetailed();

    // Re-signing in has no built-in same-account guarantee the way
    // `reauthenticateWithCredential` does. Without this check, choosing a
    // different Apple ID at the prompt would delete *that* account instead.
    if (signedIn.uid !== previousUid) {
      throw Object.assign(
        new Error('That is a different Apple ID. Sign in with the account you want to delete.'),
        { code: 'auth/user-mismatch' },
      );
    }

    return { user: signedIn, appleAuthorizationCode: authorizationCode };
  }

  throw new Error('Could not verify identity to delete this account.');
}

/** Best-effort Apple grant revocation — required by Apple, never a blocker. */
async function revokeAppleGrantIfNeeded(
  user: User,
  authorizationCode: string | null,
): Promise<DeleteAccountResult['appleRevocation']> {
  if (!getAuthProviderIds(user).includes('apple.com')) return 'not-applicable';
  if (!authorizationCode) return 'failed';

  const outcome = await revokeAppleGrantViaApi(user, authorizationCode);
  if (outcome.status === 'failed') {
    console.warn('[delete-account] Apple revocation failed:', outcome.reason);
  }
  return outcome.status === 'revoked'
    ? 'revoked'
    : outcome.status === 'not-configured'
      ? 'not-configured'
      : 'failed';
}

/**
 * Deletes the account: verify identity → revoke the Apple grant → remove the
 * person's Firestore data → delete the Firebase Auth user.
 *
 * The Auth user goes last on purpose. Once it is gone the client holds no
 * credentials, so anything not cleaned up before that point can never be
 * reached again.
 *
 * Throws with code `auth/cancelled` when the user aborts the identity check.
 */
export async function deleteAccountForCurrentUser(
  user: User,
  input: DeleteAccountInput = {},
): Promise<DeleteAccountResult> {
  let reauth: ReauthResult;
  try {
    reauth = await reauthenticateForDeletion(user, input.password);
  } catch (error) {
    if (isCancelled(error)) {
      throw Object.assign(new Error('Deletion cancelled.'), { code: 'auth/cancelled' });
    }
    throw error;
  }

  const target = reauth.user;

  // Revocation goes first because it needs credentials the deletion is about to
  // destroy: the API call is authenticated with this user's ID token, and
  // Apple's authorization code expires within minutes of being issued. The
  // trade-off is that a later failure leaves the grant revoked on a surviving
  // account — recoverable, since Apple simply prompts again on next sign-in.
  const appleRevocation = await revokeAppleGrantIfNeeded(target, reauth.appleAuthorizationCode);
  const cleanup = await deleteUserAccountData(target);

  try {
    await deleteCurrentAuthUser(target);
  } catch (error) {
    // The identity check above was seconds ago, but data cleanup sits between
    // the two and a slow network can push us past Firebase's freshness window.
    // Retrying is only possible for passwords — the OAuth prompts cannot be
    // replayed without asking the user again.
    if (errorCode(error) === 'auth/requires-recent-login' && input.password?.trim()) {
      await reauthenticateWithPassword(target, input.password.trim());
      await deleteCurrentAuthUser(getFirebaseAuth().currentUser ?? target);
    } else {
      throw error;
    }
  }

  return {
    dataFullyRemoved: accountDataCleanupIsComplete(cleanup),
    cleanup,
    appleRevocation,
  };
}

export function accountUsesPassword(user: User | null | undefined): boolean {
  if (!user) return false;
  return getAuthProviderIds(user).includes('password');
}
