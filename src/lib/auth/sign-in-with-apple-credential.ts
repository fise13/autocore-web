import {
  Auth,
  OAuthProvider,
  User,
  signInWithCredential,
  updateProfile,
} from "firebase/auth";

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

function buildDisplayName(user?: AppleJsUser): string | null {
  const firstName = user?.name?.firstName?.trim();
  const lastName = user?.name?.lastName?.trim();
  const displayName = [firstName, lastName].filter(Boolean).join(" ").trim();
  return displayName || null;
}

async function applyAppleDisplayName(user: User, appleUser?: AppleJsUser) {
  const displayName = buildDisplayName(appleUser);
  if (!displayName || user.displayName?.trim()) {
    logFirebaseSignInResult("display-name-skipped", {
      reason: displayName ? "already-set" : "missing-from-apple",
      firebaseDisplayName: user.displayName,
    });
    return;
  }

  await updateProfile(user, { displayName });
  logFirebaseSignInResult("display-name-applied", { displayName });
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
    await applyAppleDisplayName(result.user, appleUser);
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
  logAppleJs("flow-start");
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
