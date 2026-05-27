import { OAuthProvider } from "firebase/auth";

export function createAppleOAuthProvider() {
  const provider = new OAuthProvider("apple.com");
  provider.addScope("email");
  provider.setCustomParameters({
    locale: "ru",
  });
  return provider;
}
