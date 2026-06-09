import { logAppleJs } from "@/lib/auth/apple-auth-log";

export type AppleAuthInitConfig = {
  clientId: string;
  redirectURI: string;
  scope: string;
  state: string;
  nonce: string;
  usePopup: boolean;
};

export type AppleTokenIssuancePhase = "before_token_issuance" | "after_token_issuance" | "indeterminate";

export type AppleSdkForensicCapture = {
  failurePoint: string;
  rawError: unknown;
  errorCode: string | null;
  errorField: unknown;
  message: string | null;
  payload: Record<string, unknown>;
  payloadJson: string;
  tokenIssuancePhase: AppleTokenIssuancePhase;
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function jsonReplacer(_key: string, value: unknown): unknown {
  if (value instanceof Error) {
    const extra = value as Error & Record<string, unknown>;
    return {
      name: value.name,
      message: value.message,
      stack: value.stack,
      code: typeof extra.code === "string" ? extra.code : undefined,
      error: extra.error,
    };
  }
  return value;
}

export function safeAppleSdkJson(value: unknown): string {
  try {
    return JSON.stringify(value, jsonReplacer, 2);
  } catch {
    return String(value);
  }
}

function resolveAppleSdkErrorCode(payload: Record<string, unknown>): string | null {
  if (typeof payload.code === "string" || typeof payload.code === "number") {
    return String(payload.code);
  }
  if (typeof payload.error === "string") {
    return payload.error;
  }
  return null;
}

function resolveAppleSdkErrorMessage(payload: Record<string, unknown>, error: unknown): string | null {
  if (typeof payload.message === "string") {
    return payload.message;
  }
  if (error instanceof Error) {
    return error.message;
  }
  return null;
}

export function hasAppleAuthorizationToken(value: unknown): boolean {
  if (!isRecord(value)) return false;

  const authorization = value.authorization;
  if (!isRecord(authorization)) return false;

  const idToken = authorization.id_token;
  return typeof idToken === "string" && idToken.trim().length > 0;
}

/** Classifies whether Apple issued tokens before the SDK reported failure. */
export function classifyAppleTokenIssuancePhase(
  value: unknown,
  context: "signIn-resolve" | "signIn-reject" | "success-event" | "failure-event" | "unknown" = "unknown",
): AppleTokenIssuancePhase {
  if (hasAppleAuthorizationToken(value)) {
    return "after_token_issuance";
  }

  if (context === "signIn-resolve") {
    const authorization = isRecord(value) && isRecord(value.authorization) ? value.authorization : null;
    const hasCode = typeof authorization?.code === "string" && authorization.code.trim().length > 0;
    return hasCode ? "after_token_issuance" : "before_token_issuance";
  }

  if (context === "success-event") {
    return "after_token_issuance";
  }

  if (context === "signIn-reject" || context === "failure-event") {
    return "before_token_issuance";
  }

  return "indeterminate";
}

/** Always-on: exact AppleID.auth.init() arguments passed to the SDK. */
export function logAppleAuthInitPayload(config: AppleAuthInitConfig, failurePoint: string): void {
  const payload = {
    clientId: config.clientId,
    redirectURI: config.redirectURI,
    scope: config.scope,
    state: config.state,
    nonce: config.nonce,
    usePopup: config.usePopup,
  };

  console.warn("[APPLE SDK FORENSIC]");
  console.warn("# AppleID.auth.init payload", payload);
  console.warn("# Exact Failure Point", failurePoint);

  logAppleJs("auth-init-payload", { failurePoint, ...payload });
}

/** Always-on: full AppleID.auth.signIn() resolved value. */
export function logAppleAuthSignInResult(
  result: unknown,
  failurePoint: string,
): { tokenIssuancePhase: AppleTokenIssuancePhase } {
  const tokenIssuancePhase = classifyAppleTokenIssuancePhase(result, "signIn-resolve");

  console.warn("[APPLE SDK FORENSIC]");
  console.warn("# AppleID.auth.signIn result", result);
  console.warn("# Token issuance phase", tokenIssuancePhase);
  console.warn("# Exact Failure Point", failurePoint);

  logAppleJs("auth-signIn-result", {
    failurePoint,
    tokenIssuancePhase,
    resultJson: safeAppleSdkJson(result),
  });

  return { tokenIssuancePhase };
}

export function invokeAppleAuthInit(
  config: AppleAuthInitConfig,
  failurePoint: string,
): void {
  logAppleAuthInitPayload(config, failurePoint);
  window.AppleID!.auth.init({
    clientId: config.clientId,
    scope: config.scope,
    redirectURI: config.redirectURI,
    state: config.state,
    usePopup: config.usePopup,
    nonce: config.nonce,
  });
}

export function captureAppleSdkError(
  error: unknown,
  tokenIssuancePhase: AppleTokenIssuancePhase = "before_token_issuance",
): Omit<AppleSdkForensicCapture, "failurePoint"> {
  const payload: Record<string, unknown> = {};

  if (error instanceof Error) {
    payload.name = error.name;
    payload.message = error.message;
    payload.stack = error.stack;
    const extra = error as Error & Record<string, unknown>;
    if (extra.code !== undefined) payload.code = extra.code;
    if (extra.error !== undefined) payload.error = extra.error;
    for (const key of Object.getOwnPropertyNames(error)) {
      if (!(key in payload)) {
        payload[key] = extra[key];
      }
    }
  } else if (isRecord(error)) {
    Object.assign(payload, error);
  } else {
    payload.value = error;
  }

  const errorCode = resolveAppleSdkErrorCode(payload);
  const message = resolveAppleSdkErrorMessage(payload, error);

  return {
    rawError: error,
    errorCode,
    errorField: payload.error ?? null,
    message,
    payload,
    payloadJson: safeAppleSdkJson(payload),
    tokenIssuancePhase,
  };
}

/** Always-on forensic log for Apple JS SDK runtime errors (not gated by authDebug). */
export function logAppleSdkForensic(
  failurePoint: string,
  error: unknown,
  extra?: Record<string, unknown>,
  tokenIssuancePhase: AppleTokenIssuancePhase = "before_token_issuance",
): AppleSdkForensicCapture {
  const capture: AppleSdkForensicCapture = {
    failurePoint,
    ...captureAppleSdkError(error, tokenIssuancePhase),
  };

  console.warn("[APPLE SDK FORENSIC]");
  console.warn("# Apple JS SDK error object", capture.rawError);
  console.warn("# Apple JS SDK error code", capture.errorCode ?? "(none)");
  console.warn("# Apple JS SDK error message", capture.message ?? "(none)");
  console.warn("# Token issuance phase", capture.tokenIssuancePhase);
  console.warn("# Apple Error Payload", capture.payloadJson);
  console.warn("# Exact Failure Point", capture.failurePoint);
  if (extra && Object.keys(extra).length > 0) {
    console.warn("# Extra", safeAppleSdkJson(extra));
  }

  logAppleJs("sdk-forensic", {
    failurePoint: capture.failurePoint,
    errorCode: capture.errorCode,
    errorField: capture.errorField,
    message: capture.message,
    tokenIssuancePhase: capture.tokenIssuancePhase,
    payloadJson: capture.payloadJson,
    extra: extra ?? null,
  });

  return capture;
}

export function logAppleSdkEventForensic(
  failurePoint: string,
  event: Event,
  extra?: Record<string, unknown>,
): void {
  const customEvent = event as CustomEvent<unknown>;
  const detail = customEvent.detail;
  const isSuccess = event.type === "AppleIDSignInOnSuccess";
  const tokenIssuancePhase = classifyAppleTokenIssuancePhase(
    detail,
    isSuccess ? "success-event" : "failure-event",
  );

  const payload = isRecord(detail) ? detail : { type: event.type, detail };
  const errorCode = resolveAppleSdkErrorCode(payload);
  const message = resolveAppleSdkErrorMessage(payload, detail);

  console.warn("[APPLE SDK FORENSIC]");
  if (isSuccess) {
    console.warn("# AppleID.auth.signIn result", detail ?? event);
  } else {
    console.warn("# Apple JS SDK error object", detail ?? event);
    console.warn("# Apple JS SDK error code", errorCode ?? "(none)");
    console.warn("# Apple JS SDK error message", message ?? "(none)");
  }
  console.warn("# Token issuance phase", tokenIssuancePhase);
  console.warn("# Apple Error Payload", safeAppleSdkJson(detail ?? { type: event.type }));
  console.warn("# Exact Failure Point", failurePoint);
  if (extra && Object.keys(extra).length > 0) {
    console.warn("# Extra", safeAppleSdkJson(extra));
  }

  logAppleJs("sdk-forensic-event", {
    failurePoint,
    eventType: event.type,
    tokenIssuancePhase,
    errorCode,
    message,
    detailJson: safeAppleSdkJson(detail ?? null),
    extra: extra ?? null,
  });
}

export function installApplePopupMessageTap(label: string): () => void {
  const handler = (event: MessageEvent) => {
    const payload = {
      label,
      origin: event.origin,
      lastEventId: event.lastEventId,
      sourcePresent: Boolean(event.source),
      dataType: typeof event.data,
      data: event.data,
      dataJson: safeAppleSdkJson(event.data),
    };

    console.warn("[APPLE SDK FORENSIC] # Popup postMessage", payload);
    logAppleJs("popup-postmessage", payload);
  };

  window.addEventListener("message", handler);
  return () => window.removeEventListener("message", handler);
}

export async function invokeAppleAuthSignIn(
  failurePointPrefix: string,
): Promise<{ authorization: { id_token?: string; code?: string; state?: string }; user?: unknown }> {
  const failurePoint = `${failurePointPrefix}:AppleID.auth.signIn()`;
  logAppleJs("signIn-call-start", { failurePointPrefix, failurePoint });

  try {
    const result = await window.AppleID!.auth.signIn();
    const { tokenIssuancePhase } = logAppleAuthSignInResult(result, failurePoint);
    logAppleJs("signIn-call-resolve", {
      failurePointPrefix,
      failurePoint,
      tokenIssuancePhase,
      hasAuthorization: Boolean(result?.authorization),
      authorizationKeys: result?.authorization ? Object.keys(result.authorization) : [],
      hasIdToken: hasAppleAuthorizationToken(result),
      hasUser: Boolean(result?.user),
      resultJson: safeAppleSdkJson(result),
    });
    return result;
  } catch (error) {
    logAppleSdkForensic(`${failurePoint}:promise-reject`, error, undefined, "before_token_issuance");
    throw error;
  }
}
