export type EmailSignInMode = "login" | "signup" | "oauth";

export type EmailSignInModeResult = {
  mode: EmailSignInMode;
  oauthProviders: Array<"google.com" | "apple.com">;
};

export function resolveEmailSignInMode(signInMethods: string[]): EmailSignInModeResult {
  const oauthProviders = signInMethods.filter(
    (method): method is "google.com" | "apple.com" =>
      method === "google.com" || method === "apple.com",
  );

  if (signInMethods.includes("password")) {
    return { mode: "login", oauthProviders };
  }

  if (oauthProviders.length > 0) {
    return { mode: "oauth", oauthProviders };
  }

  return { mode: "signup", oauthProviders: [] };
}
