import { APPLE_WEB_CLIENT_ID, isAppleJsPopupEnabled } from "@/lib/auth/apple-auth-mode";
import {
  getAppleJsDeveloperChecklist,
  getAppleJsLoginRedirectUri,
  getAppleJsSetupIssue,
} from "@/lib/auth/apple-js-setup";
import { createRandomNonce, sha256Nonce } from "@/lib/auth/apple-nonce";
import {
  logAppleAuthError,
  logAppleAuthStep,
  logAppleIdToken,
  logAppleJs,
  logAppleNonce,
} from "@/lib/auth/apple-auth-log";
import { logAuthDebug } from "@/lib/auth/auth-debug";
import {
  installApplePopupMessageTap,
  invokeAppleAuthSignIn,
  logAppleSdkEventForensic,
  logAppleSdkForensic,
  safeAppleSdkJson,
} from "@/lib/auth/apple-js-forensic";

export { APPLE_WEB_CLIENT_ID };

const APPLE_JS_URL =
  "https://appleid.cdn-apple.com/appleauth/static/jsapi/appleid/1/en_US/appleid.auth.js";

export const APPLE_NONCE_STORAGE_KEY = "autocore.appleRawNonce";
export const APPLE_HASHED_NONCE_STORAGE_KEY = "autocore.appleHashedNonce";
export const APPLE_REDIRECT_FLAG = "autocore.appleJsRedirect";

export type AppleJsUser = {
  email?: string;
  name?: {
    firstName?: string;
    lastName?: string;
  };
};

export type AppleJsAuthorization = {
  id_token: string;
  code?: string;
  state?: string;
};

export type AppleJsSignInResult = {
  authorization: AppleJsAuthorization;
  user?: AppleJsUser;
  rawNonce: string;
};

export class AppleJsRedirectStarted extends Error {
  constructor() {
    super("apple-js-redirect-started");
    this.name = "AppleJsRedirectStarted";
  }
}

export class AppleUserCancelledError extends Error {
  constructor(message = "popup_closed_by_user") {
    super(message);
    this.name = "AppleUserCancelledError";
  }
}

type AppleJsSuccessEvent = CustomEvent<{ authorization: AppleJsAuthorization; user?: AppleJsUser }>;
type AppleJsFailureEvent = CustomEvent<Record<string, unknown> | { error: string }>;

declare global {
  interface Window {
    AppleID?: {
      auth: {
        init: (config: Record<string, unknown>) => void;
        signIn: () => Promise<Omit<AppleJsSignInResult, "rawNonce">>;
      };
    };
  }
}

let appleJsPromise: Promise<void> | null = null;

type PreparedAppleSession = {
  rawNonce: string;
  hashedNonce: string;
};

let preparedSession: PreparedAppleSession | null = null;
let preparePromise: Promise<PreparedAppleSession | null> | null = null;
let pendingRawNonce: string | null = null;

function loadAppleJs(): Promise<void> {
  if (typeof window === "undefined") {
    return Promise.reject(new Error("AppleID script unavailable (no window)"));
  }

  if (window.AppleID) {
    return Promise.resolve();
  }

  if (!appleJsPromise) {
    appleJsPromise = new Promise((resolve, reject) => {
      const existing = document.querySelector<HTMLScriptElement>(`script[src="${APPLE_JS_URL}"]`);
      if (existing) {
        if (window.AppleID || existing.dataset.loaded === "true") {
          resolve();
          return;
        }
        existing.addEventListener(
          "load",
          () => {
            existing.dataset.loaded = "true";
            resolve();
          },
          { once: true },
        );
        existing.addEventListener(
          "error",
          (event) => reject(event),
          { once: true },
        );
        return;
      }

      const script = document.createElement("script");
      script.src = APPLE_JS_URL;
      script.async = true;
      script.onload = () => {
        script.dataset.loaded = "true";
        resolve();
      };
      script.onerror = (event) => reject(event);
      document.head.appendChild(script);
    });
  }

  return appleJsPromise;
}

export function preloadAppleJs(): Promise<void> {
  return loadAppleJs();
}

export { getAppleJsDeveloperChecklist, getAppleJsLoginRedirectUri, getAppleJsSetupIssue } from "@/lib/auth/apple-js-setup";

export function getAppleWebRedirectUri(_options?: { usePopup?: boolean }): string {
  void _options;
  return getAppleJsLoginRedirectUri();
}

export function isAppleUserCancellationError(error: unknown): boolean {
  if (error instanceof AppleUserCancelledError) return true;

  const message =
    error instanceof Error
      ? error.message
      : error && typeof error === "object" && "error" in error
        ? String((error as { error: string }).error)
        : String(error);

  return message === "popup_closed_by_user" || message === "user_cancelled_authorize";
}

export function asAppleUserCancelledError(error: unknown): AppleUserCancelledError {
  if (error instanceof AppleUserCancelledError) return error;
  return new AppleUserCancelledError(normalizeAppleJsError(error).message);
}

export function prefersAppleJsRedirect(): boolean {
  if (typeof window === "undefined") return false;
  return /iPhone|iPad|iPod|Android|Mobile/i.test(navigator.userAgent);
}

export function isPopupBlockedError(error: unknown): boolean {
  if (error instanceof Error) {
    return error.message === "popup_blocked_by_browser";
  }
  if (error && typeof error === "object" && "error" in error) {
    return String((error as { error: string }).error) === "popup_blocked_by_browser";
  }
  return false;
}

export function normalizeAppleJsError(error: unknown): Error {
  if (error instanceof Error) return error;
  if (error && typeof error === "object" && "error" in error) {
    return new Error(String((error as { error: string }).error));
  }
  return new Error(String(error));
}

export function clearAppleJsSession() {
  if (typeof window === "undefined") return;
  sessionStorage.removeItem(APPLE_NONCE_STORAGE_KEY);
  sessionStorage.removeItem(APPLE_HASHED_NONCE_STORAGE_KEY);
  sessionStorage.removeItem(APPLE_REDIRECT_FLAG);
}

export function resetAppleSignInSession() {
  preparedSession = null;
  preparePromise = null;
  pendingRawNonce = null;
  clearAppleJsSession();
  logAppleNonce("session-reset");
}

export function readAppleRawNonce(): string | null {
  if (typeof window === "undefined") return null;
  return pendingRawNonce ?? sessionStorage.getItem(APPLE_NONCE_STORAGE_KEY);
}

function storeAppleNonceSession(rawNonce: string, hashedNonce: string) {
  pendingRawNonce = rawNonce;
  if (typeof window === "undefined") return;
  sessionStorage.setItem(APPLE_NONCE_STORAGE_KEY, rawNonce);
  sessionStorage.setItem(APPLE_HASHED_NONCE_STORAGE_KEY, hashedNonce);
}

export function prepareAppleSignInSession(): Promise<PreparedAppleSession | null> {
  if (typeof window === "undefined") {
    return Promise.resolve(null);
  }

  if (preparedSession) {
    return Promise.resolve(preparedSession);
  }

  if (!preparePromise) {
    preparePromise = (async () => {
      try {
        await loadAppleJs();
        const rawNonce = createRandomNonce();
        const hashedNonce = await sha256Nonce(rawNonce);
        preparedSession = { rawNonce, hashedNonce };
        logAppleJs("session-prepared", {
          clientId: APPLE_WEB_CLIENT_ID,
          popupRedirectURI: getAppleWebRedirectUri({ usePopup: true }),
          redirectFlowURI: getAppleWebRedirectUri({ usePopup: false }),
          rawNonceLength: rawNonce.length,
          hashedNonceLength: hashedNonce.length,
        });
        logAppleNonce("prepared", { rawNonceLength: rawNonce.length });
        logAuthDebug("apple-js", "session prepared", {
          clientId: APPLE_WEB_CLIENT_ID,
          popupRedirectURI: getAppleWebRedirectUri({ usePopup: true }),
        });
        return preparedSession;
      } catch (error) {
        resetAppleSignInSession();
        logAppleAuthError("apple-js:prepare-session", error);
        logAuthDebug("apple-js", "session prepare failed", error);
        throw error;
      } finally {
        preparePromise = null;
      }
    })();
  }

  return preparePromise;
}

function consumePreparedSession(): PreparedAppleSession {
  if (preparedSession) {
    const session = preparedSession;
    preparedSession = null;
    logAppleNonce("consumed", { rawNonceLength: session.rawNonce.length });
    return session;
  }

  const error = new Error("Apple Sign-In session not prepared");
  logAppleAuthError("apple-js:consume-session", error);
  throw error;
}

function restorePreparedSession(session: PreparedAppleSession) {
  preparedSession = session;
}

function initAppleAuth(session: PreparedAppleSession, usePopup: boolean) {
  const redirectURI = getAppleWebRedirectUri({ usePopup });
  logAppleJs(usePopup ? "popup-init" : "redirect-init", {
    clientId: APPLE_WEB_CLIENT_ID,
    redirectURI,
    usePopup,
    hashedNoncePreview: `${session.hashedNonce.slice(0, 8)}…`,
  });

  window.AppleID!.auth.init({
    clientId: APPLE_WEB_CLIENT_ID,
    scope: "name email",
    redirectURI,
    state: `autocore-web-${Date.now()}`,
    usePopup,
    nonce: session.hashedNonce,
  });

  logAppleJs("auth-init-config", {
    clientId: APPLE_WEB_CLIENT_ID,
    scope: "name email",
    redirectURI,
    usePopup,
    nonceLength: session.hashedNonce.length,
    statePrefix: "autocore-web",
  });

  return redirectURI;
}

function waitForAppleAuthEvent(timeoutMs: number): Promise<Omit<AppleJsSignInResult, "rawNonce">> {
  return new Promise((resolve, reject) => {
    const timeout = window.setTimeout(() => {
      cleanup();
      const error = new Error("Apple Sign-In popup timed out");
      logAppleAuthError("apple-js:popup-timeout", error);
      reject(error);
    }, timeoutMs);

    const onSuccess = (event: Event) => {
      const detail = (event as AppleJsSuccessEvent).detail;
      cleanup();
      logAppleSdkEventForensic("document:AppleIDSignInOnSuccess", event, {
        hasIdToken: Boolean(detail.authorization?.id_token),
        detailJson: safeAppleSdkJson(detail),
      });
      logAppleJs("auth-success-event", {
        hasIdToken: Boolean(detail.authorization?.id_token),
        hasUser: Boolean(detail.user),
        hasCode: Boolean(detail.authorization?.code),
      });
      resolve({
        authorization: detail.authorization,
        user: detail.user,
      });
    };

    const onFailure = (event: Event) => {
      const detail = (event as AppleJsFailureEvent).detail;
      cleanup();
      logAppleSdkEventForensic("document:AppleIDSignInOnFailure", event, {
        detailJson: safeAppleSdkJson(detail),
      });

      const detailError =
        detail && typeof detail === "object" && "error" in detail
          ? String((detail as { error: string }).error)
          : safeAppleSdkJson(detail);

      const error = new Error(detailError || "Apple Sign-In failure event without error detail");
      if (isAppleUserCancellationError(error) || isAppleUserCancellationError(detail)) {
        logAppleJs("auth-cancelled", { reason: error.message, detailJson: safeAppleSdkJson(detail) });
        reject(asAppleUserCancelledError(error));
        return;
      }
      logAppleSdkForensic("document:AppleIDSignInOnFailure:reject", error, { detail });
      reject(error);
    };

    const cleanup = () => {
      window.clearTimeout(timeout);
      document.removeEventListener("AppleIDSignInOnSuccess", onSuccess);
      document.removeEventListener("AppleIDSignInOnFailure", onFailure);
    };

    document.addEventListener("AppleIDSignInOnSuccess", onSuccess);
    document.addEventListener("AppleIDSignInOnFailure", onFailure);
  });
}

function finalizeAppleJsResult(
  result: Omit<AppleJsSignInResult, "rawNonce">,
  rawNonce: string,
): AppleJsSignInResult {
  const idToken = result.authorization.id_token?.trim() ?? "";
  if (!idToken) {
    const error = new Error("Apple JS authorization response missing id_token");
    logAppleAuthError("apple-js:missing-id-token", error);
    throw error;
  }

  logAppleIdToken("received", {
    length: idToken.length,
    preview: `${idToken.slice(0, 16)}…`,
    hasAuthorizationCode: Boolean(result.authorization.code),
    hasUser: Boolean(result.user),
    email: result.user?.email ?? null,
  });
  logAppleNonce("paired-with-id-token", { rawNonceLength: rawNonce.length });

  return { ...result, rawNonce };
}

async function signInWithAppleJsPopup(session: PreparedAppleSession): Promise<AppleJsSignInResult> {
  storeAppleNonceSession(session.rawNonce, session.hashedNonce);
  initAppleAuth(session, true);

  logAppleJs("popup-start");
  const removeMessageTap = installApplePopupMessageTap("signInWithAppleJsPopup");

  try {
    const eventPromise = waitForAppleAuthEvent(120_000);

    let result: Omit<AppleJsSignInResult, "rawNonce">;
    try {
      const signInPromise = invokeAppleAuthSignIn("signInWithAppleJsPopup") as Promise<
        Omit<AppleJsSignInResult, "rawNonce">
      >;
      result = await Promise.race([signInPromise, eventPromise]);
      logAppleJs("popup-race-winner", {
        source: result?.authorization?.id_token ? "signIn-or-success-event" : "unknown",
        resultJson: safeAppleSdkJson(result),
      });
    } catch (raceError) {
      logAppleSdkForensic("signInWithAppleJsPopup:Promise.race", raceError);
      throw raceError;
    }

    return finalizeAppleJsResult(result, session.rawNonce);
  } finally {
    removeMessageTap();
  }
}

async function signInWithAppleJsRedirect(session: PreparedAppleSession): Promise<never> {
  storeAppleNonceSession(session.rawNonce, session.hashedNonce);
  if (typeof window !== "undefined") {
    sessionStorage.setItem(APPLE_REDIRECT_FLAG, "1");
  }

  initAppleAuth(session, false);
  logAppleJs("redirect-start");

  const removeMessageTap = installApplePopupMessageTap("signInWithAppleJsRedirect");
  try {
    await invokeAppleAuthSignIn("signInWithAppleJsRedirect");
  } finally {
    removeMessageTap();
  }
  throw new AppleJsRedirectStarted();
}

export function hasPendingAppleJsRedirect(): boolean {
  if (typeof window === "undefined") return false;
  return sessionStorage.getItem(APPLE_REDIRECT_FLAG) === "1";
}

/**
 * macOS parity: rawNonce → SHA256(nonce) → Apple popup/redirect → id_token → Firebase credential.
 */
export async function signInWithAppleJs(): Promise<AppleJsSignInResult> {
  const setupIssue = getAppleJsSetupIssue();
  if (setupIssue) {
    logAppleAuthError("apple-js:setup", new Error(setupIssue));
    throw new Error(setupIssue);
  }

  const usePopup = isAppleJsPopupEnabled();
  logAppleJs("sign-in-start", {
    clientId: APPLE_WEB_CLIENT_ID,
    usePopup,
    redirectURI: getAppleWebRedirectUri(),
    hasPreparedSession: Boolean(preparedSession),
    checklist: getAppleJsDeveloperChecklist(),
  });

  if (!window.AppleID) {
    await loadAppleJs();
  }
  if (!window.AppleID) {
    const error = new Error("window.AppleID is undefined after script load");
    logAppleAuthError("apple-js:missing-apple-id", error);
    throw error;
  }

  if (!preparedSession) {
    await prepareAppleSignInSession();
  }

  const session = consumePreparedSession();

  try {
    if (!usePopup) {
      await signInWithAppleJsRedirect(session);
    }

    try {
      return await signInWithAppleJsPopup(session);
    } catch (error) {
      logAppleSdkForensic("signInWithAppleJs:popup-or-redirect-inner-catch", error);
      if (isAppleUserCancellationError(error)) {
        resetAppleSignInSession();
        logAppleJs("sign-in-cancelled-by-user");
        throw asAppleUserCancelledError(error);
      }

      if (!isPopupBlockedError(error)) {
        throw normalizeAppleJsError(error);
      }

      logAppleJs("popup-blocked-fallback-to-redirect", { message: "popup_blocked_by_browser" });
      restorePreparedSession(session);
      await signInWithAppleJsRedirect(session);
    }
  } catch (error) {
    if (error instanceof AppleJsRedirectStarted) {
      throw error;
    }
    if (isAppleUserCancellationError(error)) {
      resetAppleSignInSession();
      throw asAppleUserCancelledError(error);
    }
    logAppleSdkForensic("signInWithAppleJs:outer-catch", error);
    resetAppleSignInSession();
    logAppleAuthError("apple-js:signIn", error);
    throw normalizeAppleJsError(error);
  }

  throw new Error("Apple JS sign-in unreachable");
}

/** @deprecated Use clearAppleJsSession */
export const clearAppleRawNonce = clearAppleJsSession;

export function clearStaleAppleAuthSession() {
  resetAppleSignInSession();
}

/** Complete Apple JS redirect return on /login after usePopup: false. */
export async function bootstrapAppleJsReturn(): Promise<AppleJsSignInResult | null> {
  if (typeof window === "undefined") return null;
  if (!hasPendingAppleJsRedirect()) return null;

  const rawNonce = readAppleRawNonce();
  if (!rawNonce) {
    logAppleAuthError("apple-js:bootstrap", new Error("Missing rawNonce after Apple redirect"));
    clearAppleJsSession();
    return null;
  }

  await loadAppleJs();
  if (!window.AppleID) return null;

  const hashedNonce = sessionStorage.getItem(APPLE_HASHED_NONCE_STORAGE_KEY);
  if (hashedNonce) {
    window.AppleID.auth.init({
      clientId: APPLE_WEB_CLIENT_ID,
      scope: "name email",
      redirectURI: getAppleWebRedirectUri({ usePopup: false }),
      usePopup: false,
      nonce: hashedNonce,
      state: "autocore-web-return",
    });
  }

  logAppleJs("redirect-return-bootstrap", { rawNonceLength: rawNonce.length, hasHashedNonce: Boolean(hashedNonce) });

  return new Promise((resolve) => {
    const timeout = window.setTimeout(() => {
      cleanup();
      logAppleJs("redirect-return-timeout");
      resolve(null);
    }, 15_000);

    const onSuccess = (event: Event) => {
      const detail = (event as AppleJsSuccessEvent).detail;
      cleanup();
      sessionStorage.removeItem(APPLE_REDIRECT_FLAG);
      try {
        resolve(finalizeAppleJsResult({ authorization: detail.authorization, user: detail.user }, rawNonce));
      } catch (error) {
        logAppleAuthError("apple-js:bootstrap-success", error);
        resolve(null);
      }
    };

    const onFailure = (event: Event) => {
      const detail = (event as AppleJsFailureEvent).detail;
      cleanup();
      sessionStorage.removeItem(APPLE_REDIRECT_FLAG);
      logAppleSdkEventForensic("bootstrapAppleJsReturn:AppleIDSignInOnFailure", event, {
        detailJson: safeAppleSdkJson(detail),
      });
      resolve(null);
    };

    const cleanup = () => {
      window.clearTimeout(timeout);
      document.removeEventListener("AppleIDSignInOnSuccess", onSuccess);
      document.removeEventListener("AppleIDSignInOnFailure", onFailure);
    };

    document.addEventListener("AppleIDSignInOnSuccess", onSuccess);
    document.addEventListener("AppleIDSignInOnFailure", onFailure);
  });
}
