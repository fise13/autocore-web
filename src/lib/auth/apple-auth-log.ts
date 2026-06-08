import { isAuthDebugEnabled, logAuthDebug } from "@/lib/auth/auth-debug";

type FirebaseLikeError = {
  code?: string;
  message?: string;
  stack?: string;
  customData?: unknown;
};

function serializeAppleAuthError(error: unknown): Record<string, unknown> {
  if (error instanceof Error) {
    const firebaseError = error as FirebaseLikeError;
    return {
      name: error.name,
      message: error.message,
      code: firebaseError.code,
      customData: firebaseError.customData,
      stack: error.stack,
    };
  }
  if (error && typeof error === "object") {
    return { ...(error as Record<string, unknown>) };
  }
  return { value: String(error) };
}

/** Diagnostic log — uses warn so Next.js dev overlay does not treat it as a runtime crash. */
export function logAppleAuthError(context: string, error: unknown): void {
  console.warn("[APPLE AUTH]", context, serializeAppleAuthError(error));
  logAuthDebug("apple-auth-error", context, error);
}

/** Logs flow steps when authDebug is enabled (?authDebug=1 or NEXT_PUBLIC_AUTH_DEBUG=true). */
export function logAppleAuthStep(step: string, detail?: unknown): void {
  logAuthDebug("apple-auth", step, detail);
  if (isAuthDebugEnabled()) {
    console.info("[APPLE AUTH]", step, detail ?? "");
  }
}

function logAppleTag(tag: string, message: string, detail?: unknown): void {
  console.info(tag, message, detail ?? "");
  logAuthDebug(tag.replace(/^\[|\]$/g, "").toLowerCase(), message, detail);
}

export function logAppleJs(message: string, detail?: unknown): void {
  logAppleTag("[APPLE_JS]", message, detail);
}

export function logAppleIdToken(message: string, detail?: unknown): void {
  logAppleTag("[APPLE_ID_TOKEN]", message, detail);
}

export function logAppleNonce(message: string, detail?: unknown): void {
  logAppleTag("[APPLE_NONCE]", message, detail);
}

export function logFirebaseCredential(message: string, detail?: unknown): void {
  logAppleTag("[FIREBASE_CREDENTIAL]", message, detail);
}

export function logFirebaseSignInResult(message: string, detail?: unknown): void {
  logAppleTag("[FIREBASE_SIGNIN_RESULT]", message, detail);
}

/** UI string from the real error — no mapAuthError, no synthetic diagnostics. */
export function formatAppleAuthErrorForUi(error: unknown): string {
  const message =
    error instanceof Error
      ? error.message
      : error && typeof error === "object" && "error" in error
        ? String((error as { error: string }).error)
        : String(error);

  if (
    message.includes("Registration not completed") ||
    message.includes("Регистрация не выполнена") ||
    message.includes("invalid_request") ||
    message.includes("redirect_uri")
  ) {
    return (
      "Apple отклонил вход: Return URL не совпадает с Apple Developer. " +
      "Добавьте точный URL вида https://ваш-домен/login в Services ID → Return URLs " +
      "(сейчас нужен тот же origin, с которого открыт сайт)."
    );
  }

  if (error instanceof Error) {
    const code = (error as FirebaseLikeError).code;
    if (code) {
      return `${code}: ${error.message}`;
    }
    return error.message;
  }
  return String(error);
}
