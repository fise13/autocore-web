import { OAuthProvider } from "firebase/auth";

/** Firebase OAuth provider for Sign in with Apple (web). */
export function createAppleOAuthProvider() {
  const provider = new OAuthProvider("apple.com");
  provider.addScope("email");
  provider.addScope("name");
  provider.setCustomParameters({
    locale: "ru",
  });
  return provider;
}
