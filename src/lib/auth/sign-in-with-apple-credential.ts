import {
  Auth,
  OAuthProvider,
  User,
  signInWithCredential,
  updateProfile,
} from "firebase/auth";

import { buildInitialsAvatarDataUrl } from "@/lib/auth/apple-profile-avatar";
import {
  logAppleAuthError,
  logAppleAuthStep,
  logAppleIdToken,
  logAppleJs,
  logAppleNonce,
  logFirebaseCredential,
  logFirebaseSignInResult,
} from "@/lib/auth/apple-auth-log";
import {
  AppleJsUser,
  AppleJsRedirectStarted,
  bootstrapAppleJsReturn,
  isAppleUserCancellationError,
  resetAppleSignInSession,
  signInWithAppleJs,
} from "@/lib/auth/apple-js-sign-in";
import { trySignInWithAppleTauriNative, signInWithAppleTauriNativeOrThrow } from "@/lib/auth/apple-tauri-native";
import { isMacOsDesktopShell, isTauriDesktop } from "@/lib/tauri/is-tauri-desktop";

function buildDisplayName(user?: AppleJsUser): string | null {
  const firstName = user?.name?.firstName?.trim();
  const lastName = user?.name?.lastName?.trim();
  const displayName = [firstName, lastName].filter(Boolean).join(" ").trim();
  return displayName || null;
}

async function applyAppleProfile(user: User, appleUser?: AppleJsUser) {
  const displayName = buildDisplayName(appleUser);
  const email = user.email ?? appleUser?.email ?? "";
  const photoURL = user.photoURL?.trim() ? user.photoURL : buildInitialsAvatarDataUrl(displayName ?? user.displayName, email);

  const profileUpdate: { displayName?: string; photoURL?: string } = {};

  if (displayName && !user.displayName?.trim()) {
    profileUpdate.displayName = displayName;
  }

  if (!user.photoURL?.trim()) {
    profileUpdate.photoURL = photoURL;
  }

  if (Object.keys(profileUpdate).length === 0) {
    logFirebaseSignInResult("profile-skipped", {
      firebaseDisplayName: user.displayName,
      hasPhoto: Boolean(user.photoURL),
    });
    return;
  }

  await updateProfile(user, profileUpdate);
  logFirebaseSignInResult("profile-applied", {
    displayName: profileUpdate.displayName ?? user.displayName,
    photoApplied: Boolean(profileUpdate.photoURL),
  });
}

export async function completeAppleCredentialSignIn(
  auth: Auth,
  idToken: string,
  rawNonce: string,
  appleUser?: AppleJsUser,
) {
  const trimmedIdToken = idToken.trim();
  const trimmedNonce = rawNonce.trim();

  logAppleIdToken("credential-exchange-start", { idTokenLength: trimmedIdToken.length });
  logAppleNonce("credential-exchange-start", { rawNonceLength: trimmedNonce.length });

  if (!trimmedIdToken) {
    const error = new Error("Apple authorization response missing id_token");
    logAppleAuthError("credential-sign-in:missing-id-token", error);
    throw error;
  }
  if (!trimmedNonce) {
    const error = new Error("Apple authorization response missing rawNonce");
    logAppleAuthError("credential-sign-in:missing-raw-nonce", error);
    throw error;
  }

  const provider = new OAuthProvider("apple.com");
  const credential = provider.credential({
    idToken: trimmedIdToken,
    rawNonce: trimmedNonce,
  });

  logFirebaseCredential("built", {
    providerId: "apple.com",
    idTokenLength: trimmedIdToken.length,
    rawNonceLength: trimmedNonce.length,
  });
  logAppleAuthStep("firebase-signInWithCredential-start");

  try {
    const result = await signInWithCredential(auth, credential);
    logFirebaseSignInResult("success", {
      uid: result.user.uid,
      email: result.user.email,
      emailVerified: result.user.emailVerified,
      isNewUser: result.user.metadata.creationTime === result.user.metadata.lastSignInTime,
      displayName: result.user.displayName,
      providerIds: result.user.providerData.map((p) => p.providerId),
    });
    await applyAppleProfile(result.user, appleUser);
    resetAppleSignInSession();
    return result;
  } catch (error) {
    logFirebaseSignInResult("failed", error);
    logAppleAuthError("firebase-signInWithCredential", error);
    resetAppleSignInSession();
    throw error;
  }
}

export async function signInWithAppleLikeMacOS(auth: Auth) {
  logAppleJs("flow-start", { desktop: isTauriDesktop() });

  if (isTauriDesktop() && isMacOsDesktopShell()) {
    return signInWithAppleTauriNativeOrThrow(auth);
  }

  const nativeResult = await trySignInWithAppleTauriNative(auth);
  if (nativeResult) {
    return nativeResult;
  }

  try {
    const appleResult = await signInWithAppleJs();
    return completeAppleCredentialSignIn(
      auth,
      appleResult.authorization.id_token,
      appleResult.rawNonce,
      appleResult.user,
    );
  } catch (error) {
    if (error instanceof AppleJsRedirectStarted) {
      logAppleJs("redirect-navigation-started");
      throw error;
    }
    if (isAppleUserCancellationError(error)) {
      resetAppleSignInSession();
      throw error;
    }
    resetAppleSignInSession();
    logAppleAuthError("apple-js-flow", error);
    throw error;
  }
}

/** Finish sign-in after Apple JS redirect return on /login. */
export async function completeAppleJsReturnIfNeeded(auth: Auth) {
  const appleResult = await bootstrapAppleJsReturn();
  if (!appleResult) return null;

  return completeAppleCredentialSignIn(
    auth,
    appleResult.authorization.id_token,
    appleResult.rawNonce,
    appleResult.user,
  );
}
