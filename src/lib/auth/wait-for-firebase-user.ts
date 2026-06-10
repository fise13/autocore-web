import { onAuthStateChanged, type User } from "firebase/auth";

import { getFirebaseAuth } from "@/infrastructure/firebase/client";

export function waitForFirebaseUser(timeoutMs = 10_000): Promise<User> {
  const auth = getFirebaseAuth();
  if (auth.currentUser) {
    return Promise.resolve(auth.currentUser);
  }

  return new Promise((resolve, reject) => {
    const timeout = window.setTimeout(() => {
      unsubscribe();
      reject(new Error("Требуется авторизация"));
    }, timeoutMs);

    const unsubscribe = onAuthStateChanged(auth, (user) => {
      if (!user) return;
      window.clearTimeout(timeout);
      unsubscribe();
      resolve(user);
    });
  });
}
