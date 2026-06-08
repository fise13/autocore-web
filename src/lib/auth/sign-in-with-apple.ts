import {
  Auth,
  OAuthProvider,
  UserCredential,
  browserLocalPersistence,
  setPersistence,
  signInWithPopup,
} from "firebase/auth";

import { getFirebaseAuth } from "@/infrastructure/firebase/client";
import { logAppleAuthError, logAppleAuthStep } from "@/lib/auth/apple-auth-log";

export async function signInWithApple(auth?: Auth): Promise<UserCredential> {
  const resolvedAuth = auth ?? getFirebaseAuth();

  await setPersistence(resolvedAuth, browserLocalPersistence);

  logAppleAuthStep("legacy-sign-in-with-apple", {
    projectId: resolvedAuth.app.options.projectId,
    authDomain: resolvedAuth.app.options.authDomain,
  });

  const provider = new OAuthProvider("apple.com");
  provider.addScope("email");
  provider.addScope("name");
  provider.setCustomParameters({ locale: "ru" });

  try {
    logAppleAuthStep("legacy-popup-start");
    const result = await signInWithPopup(resolvedAuth, provider);
    logAppleAuthStep("legacy-popup-success", { uid: result.user.uid });
    return result;
  } catch (error) {
    logAppleAuthError("legacy-sign-in-with-apple", error);
    throw error;
  }
}
