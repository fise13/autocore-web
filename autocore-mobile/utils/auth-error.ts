type AuthErrorCode = string | null;

export function getAuthErrorCode(error: unknown): AuthErrorCode {
  if (typeof error === 'object' && error && 'code' in error) {
    const code = (error as { code?: unknown }).code;
    return typeof code === 'string' ? code : null;
  }

  if (error instanceof Error) {
    const match = error.message.match(/\b(auth\/[a-z0-9-]+)\b/i);
    return match?.[1] ?? null;
  }

  return null;
}

export function mapAuthError(error: unknown): string {
  const code = getAuthErrorCode(error);

  switch (code) {
    case 'auth/invalid-email':
      return 'Invalid email address.';
    case 'auth/user-disabled':
      return 'This account has been disabled.';
    case 'auth/user-not-found':
    case 'auth/wrong-password':
      return 'Incorrect email or password.';
    case 'auth/password-required':
      return 'Enter your current password to delete this account.';
    case 'auth/requires-recent-login':
      return 'Please verify your identity again, then retry the deletion.';
    case 'auth/invalid-credential':
      return "Couldn't confirm sign-in. Please try again.";
    case 'auth/missing-or-invalid-nonce':
      return 'Apple Sign In security error. Update the app and try again.';
    case 'auth/account-exists-with-different-credential':
      return 'This email is already linked to a different sign-in method.';
    case 'auth/email-already-in-use':
      return 'This email is already registered.';
    case 'auth/weak-password':
      return 'Password is too short (minimum 6 characters).';
    case 'auth/too-many-requests':
      return 'Too many attempts. Please try again later.';
    case 'auth/network-request-failed':
      return "Couldn't connect to the network. Check your internet connection and try again.";
    case 'auth/operation-not-allowed':
      return 'This sign-in method is temporarily unavailable. Enable Apple in Firebase Console.';
    default:
      if (error instanceof Error && error.message) {
        if (/network|internet|offline/i.test(error.message)) {
          return "Couldn't connect to the network. Check your internet connection and try again.";
        }
        if (/apple sign in is not (configured|available)|apple did not return|sign in with apple is (only available|not available)/i.test(error.message)) {
          return error.message;
        }
        if (/authorization attempt failed|authenticationServices/i.test(error.message)) {
          return 'Apple Sign In is not configured in this build. Rebuild the app: npx expo run:ios.';
        }
        if (/apple/i.test(error.message)) {
          return error.message;
        }
        if (/signInWithIdp|INVALID_IDP_RESPONSE|FEDERATED_USER_ID_ALREADY_LINKED/i.test(error.message)) {
          return "Couldn't confirm sign-in via Apple. Try again or sign in by email.";
        }
        return error.message.replace(/\s*\([a-z0-9/-]+\)\s*$/i, '').trim();
      }
      return "Couldn't sign in. Please try again.";
  }
}

export function isOfflineError(error: unknown): boolean {
  const code = getAuthErrorCode(error);
  if (code === 'auth/network-request-failed') return true;
  return error instanceof Error ? /network|internet|offline/i.test(error.message) : false;
}
