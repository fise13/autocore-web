import {
  Auth,
  OAuthProvider,
  UserCredential,
  browserLocalPersistence,
  setPersistence,
  signInWithPopup,
} from "firebase/auth";

import { getFirebaseAuth } from "@/infrastructure/firebase/client";

export async function signInWithApple(auth?: Auth): Promise<UserCredential> {
  const resolvedAuth = auth ?? getFirebaseAuth();

  await setPersistence(resolvedAuth, browserLocalPersistence);

  console.log("APPLE AUTH PROJECT", resolvedAuth.app.options.projectId);
  console.log("APPLE AUTH DOMAIN", resolvedAuth.app.options.authDomain);

  const provider = new OAuthProvider("apple.com");
  provider.addScope("email");
  provider.addScope("name");
  provider.setCustomParameters({ locale: "ru" });

  try {
    const result = await signInWithPopup(resolvedAuth, provider);
    console.log("Apple login success", result);
    return result;
  } catch (error) {
    console.error("Apple login failed", error);
    throw error;
  }
}
