import type { Auth, UserCredential } from "firebase/auth";

import { logAppleAuthError, logAppleJs } from "@/lib/auth/apple-auth-log";
import { createRandomNonce, sha256Nonce } from "@/lib/auth/apple-nonce";
import { completeAppleCredentialSignIn } from "@/lib/auth/sign-in-with-apple-credential";
import { isMacOsDesktopShell, isTauriDesktop } from "@/lib/tauri/is-tauri-desktop";
import { canUseTauriNativeAppleSignIn, isTauriIpcAvailable } from "@/lib/tauri/is-tauri-ipc-available";

export function canUseNativeAppleSignIn(): boolean {
  return canUseTauriNativeAppleSignIn();
}

function nativeAppleUnavailableMessage(): string {
  if (!isTauriDesktop() || !isMacOsDesktopShell()) {
    return "Native Apple Sign In доступен только в приложении AutoCore для macOS.";
  }
  if (!isTauriIpcAvailable()) {
    return (
      "Приложение AutoCore устарело или загружено без Tauri IPC. " +
      "Пересоберите desktop: npm run tauri:build:mac"
    );
  }
  return "Native Apple Sign In недоступен.";
}

export async function signInWithAppleTauriNative(auth: Auth): Promise<UserCredential> {
  const { getAppleIdCredential } = await import("tauri-plugin-siwa-api");

  const rawNonce = createRandomNonce();
  const hashedNonce = await sha256Nonce(rawNonce);

  logAppleJs("native-siwa-start", { rawNonceLength: rawNonce.length });

  const response = await getAppleIdCredential({
    scope: ["fullName", "email"],
    nonce: hashedNonce,
    state: "autocore-desktop",
  });

  if (!response.identityToken?.trim()) {
    throw new Error("Apple не вернул identity token");
  }

  logAppleJs("native-siwa-success", {
    hasEmail: Boolean(response.email),
    hasUserIdentifier: Boolean(response.userIdentifier),
  });

  return completeAppleCredentialSignIn(auth, response.identityToken, rawNonce, {
    email: response.email ?? undefined,
    name: {
      firstName: response.givenName ?? undefined,
      lastName: response.familyName ?? undefined,
    },
  });
}

export async function trySignInWithAppleTauriNative(auth: Auth): Promise<UserCredential | null> {
  if (!canUseNativeAppleSignIn()) {
    return null;
  }

  try {
    return await signInWithAppleTauriNative(auth);
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);

    if (
      message.includes("Unsupported platform") ||
      message.includes("not allowed") ||
      message.includes("Cannot find module") ||
      message.includes("remote")
    ) {
      logAppleJs("native-siwa-unavailable-fallback-web", { message });
      return null;
    }

    logAppleAuthError("apple-native-desktop", error);
    throw error;
  }
}

/** macOS desktop must use native SIWA — web Apple JS is unreliable inside WKWebView. */
export async function signInWithAppleTauriNativeOrThrow(auth: Auth): Promise<UserCredential> {
  if (!isTauriDesktop() || !isMacOsDesktopShell()) {
    throw new Error(nativeAppleUnavailableMessage());
  }

  const nativeResult = await trySignInWithAppleTauriNative(auth);
  if (nativeResult) {
    return nativeResult;
  }

  throw new Error(nativeAppleUnavailableMessage());
}
