import { createRandomNonce, sha256Nonce } from "@/lib/auth/apple-nonce";
import { getFirebaseAppleRedirectUrl } from "@/lib/auth/apple-web-setup";
import { logAuthDebug } from "@/lib/auth/auth-debug";

const APPLE_JS_URL =
  "https://appleid.cdn-apple.com/appleauth/static/jsapi/appleid/1/en_US/appleid.auth.js";

export const APPLE_WEB_CLIENT_ID =
  process.env.NEXT_PUBLIC_APPLE_WEB_CLIENT_ID?.trim() || "com.wise.AutoCore.app";

export const APPLE_NONCE_STORAGE_KEY = "autocore.appleRawNonce";

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

type AppleJsSuccessEvent = CustomEvent<{ authorization: AppleJsAuthorization; user?: AppleJsUser }>;
type AppleJsFailureEvent = CustomEvent<{ error: string }>;

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

function loadAppleJs(): Promise<void> {
  if (typeof window === "undefined") {
    return Promise.reject(new Error("apple-js-unavailable"));
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
          () => reject(new Error("Не удалось загрузить Apple Sign-In.")),
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
      script.onerror = () => reject(new Error("Не удалось загрузить Apple Sign-In."));
      document.head.appendChild(script);
    });
  }

  return appleJsPromise;
}

export function preloadAppleJs(): Promise<void> {
  return loadAppleJs();
}

export function getAppleWebRedirectUri(): string {
  const firebaseHandler = getFirebaseAppleRedirectUrl();
  if (firebaseHandler) {
    return firebaseHandler;
  }

  const authDomain = process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN?.trim();
  if (authDomain) {
    return `https://${authDomain}/__/auth/handler`;
  }

  return "https://autocore-6066c.firebaseapp.com/__/auth/handler";
}

export function clearAppleJsSession() {
  if (typeof window === "undefined") return;
  sessionStorage.removeItem(APPLE_NONCE_STORAGE_KEY);
}

export function readAppleRawNonce(): string | null {
  if (typeof window === "undefined") return null;
  return sessionStorage.getItem(APPLE_NONCE_STORAGE_KEY);
}

function storeAppleRawNonce(rawNonce: string) {
  if (typeof window === "undefined") return;
  sessionStorage.setItem(APPLE_NONCE_STORAGE_KEY, rawNonce);
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
        logAuthDebug("apple-js", "session prepared", {
          clientId: APPLE_WEB_CLIENT_ID,
          redirectURI: getAppleWebRedirectUri(),
        });
        return preparedSession;
      } catch (error) {
        logAuthDebug("apple-js", "session prepare failed", error);
        return null;
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
    return session;
  }

  throw new Error("Apple Sign-In не готов. Обновите страницу и попробуйте снова.");
}

function waitForAppleAuthEvent(timeoutMs: number): Promise<Omit<AppleJsSignInResult, "rawNonce">> {
  return new Promise((resolve, reject) => {
    const timeout = window.setTimeout(() => {
      cleanup();
      reject(new Error("auth/popup-closed-by-user"));
    }, timeoutMs);

    const onSuccess = (event: Event) => {
      const detail = (event as AppleJsSuccessEvent).detail;
      cleanup();
      resolve({
        authorization: detail.authorization,
        user: detail.user,
      });
    };

    const onFailure = (event: Event) => {
      const detail = (event as AppleJsFailureEvent).detail;
      cleanup();
      reject(new Error(detail.error || "Apple Sign-In failed"));
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

/**
 * macOS parity: rawNonce → SHA256(nonce) → Apple popup → id_token → Firebase credential.
 */
export async function signInWithAppleJs(): Promise<AppleJsSignInResult> {
  await loadAppleJs();
  if (!window.AppleID) {
    throw new Error("Apple Sign-In недоступен в этом браузере.");
  }

  if (!preparedSession) {
    await prepareAppleSignInSession();
  }

  const { rawNonce, hashedNonce } = consumePreparedSession();
  storeAppleRawNonce(rawNonce);
  clearAppleJsSession();
  storeAppleRawNonce(rawNonce);

  const redirectURI = getAppleWebRedirectUri();
  logAuthDebug("apple-js", "init popup (macOS-like)", {
    clientId: APPLE_WEB_CLIENT_ID,
    redirectURI,
  });

  window.AppleID.auth.init({
    clientId: APPLE_WEB_CLIENT_ID,
    scope: "name email",
    redirectURI,
    state: `autocore-web-${Date.now()}`,
    usePopup: true,
    nonce: hashedNonce,
  });

  logAuthDebug("apple-js", "calling signIn popup");
  const eventPromise = waitForAppleAuthEvent(120_000);
  const signInReturn = window.AppleID.auth.signIn();

  let result: Omit<AppleJsSignInResult, "rawNonce">;
  if (signInReturn && typeof signInReturn.then === "function") {
    result = await Promise.race([signInReturn, eventPromise]);
  } else {
    result = await eventPromise;
  }

  clearAppleJsSession();
  return { ...result, rawNonce };
}

/** @deprecated Use clearAppleJsSession */
export const clearAppleRawNonce = clearAppleJsSession;

export function hasPendingAppleJsRedirect(): boolean {
  return false;
}

export function clearStaleAppleAuthSession() {
  clearAppleJsSession();
}

export async function bootstrapAppleJsReturn(): Promise<AppleJsSignInResult | null> {
  return null;
}
