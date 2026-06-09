import { logAppleJs } from "@/lib/auth/apple-auth-log";
import { getAppleWebClientIdMisconfigurationIssue, isAppleJsPopupEnabled } from "@/lib/auth/apple-auth-mode";
import { isTauriDesktop } from "@/lib/tauri/is-tauri-desktop";

const APPLE_JS_REDIRECT_FLAG_KEY = "autocore.appleJsRedirect";

export type AppleAuthInitConfig = {
  clientId: string;
  redirectURI: string;
  scope: string;
  state: string;
  nonce: string;
  usePopup: boolean;
};

export type AppleJsRuntimeMode = "popup" | "redirect";
export type AppleJsModeLabel = "MODE=popup" | "MODE=redirect";
export type AppleTokenIssuancePhase = "before_token_issuance" | "after_token_issuance" | "indeterminate";

export type AppleJsModeDecision = {
  mode: AppleJsRuntimeMode;
  modeLabel: AppleJsModeLabel;
  reasons: string[];
  envPopupFlag: boolean;
  pendingRedirectReturn: boolean;
  userAgent: string | null;
};

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
    const serialized: Record<string, unknown> = {
      name: value.name,
      message: value.message,
      stack: value.stack,
    };
    for (const key of Object.getOwnPropertyNames(value)) {
      serialized[key] = extra[key];
    }
    return serialized;
  }
  return value;
}

export function safeAppleSdkJson(value: unknown): string {
  try {
    return JSON.stringify(value, jsonReplacer, 2);
  } catch {
    return JSON.stringify({ unstringifiable: String(value) }, null, 2);
  }
}

export function logAppleSdkForensicFull(label: string, value: unknown): void {
  console.error("[APPLE SDK FORENSIC FULL]", label, safeAppleSdkJson(value));
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

export function extractAppleSignInResultFields(result: unknown): Record<string, unknown> {
  const authorization =
    isRecord(result) && isRecord(result.authorization) ? result.authorization : ({} as Record<string, unknown>);
  const user = isRecord(result) ? result.user : null;

  return {
    "authorization.id_token": authorization.id_token ?? null,
    "authorization.code": authorization.code ?? null,
    "authorization.state": authorization.state ?? null,
    user,
    rawResult: result,
  };
}

export function resolveAppleJsModeDecision(options?: {
  popupBlockedFallback?: boolean;
  forceRedirectReturn?: boolean;
  initUsePopup?: boolean;
}): AppleJsModeDecision {
  const reasons: string[] = [];
  const envPopupFlag = isAppleJsPopupEnabled();
  const pendingRedirectReturn =
    typeof window !== "undefined" && sessionStorage.getItem(APPLE_JS_REDIRECT_FLAG_KEY) === "1";
  const userAgent = typeof navigator !== "undefined" ? navigator.userAgent : null;

  if (isTauriDesktop()) {
    reasons.push("Tauri desktop shell detected — popup is disabled, redirect flow is required");
    return {
      mode: "redirect",
      modeLabel: "MODE=redirect",
      reasons,
      envPopupFlag,
      pendingRedirectReturn,
      userAgent,
    };
  }

  if (options?.forceRedirectReturn || pendingRedirectReturn) {
    reasons.push(
      "Redirect return bootstrap: sessionStorage key autocore.appleJsRedirect=1 (completing prior redirect flow)",
    );
    return {
      mode: "redirect",
      modeLabel: "MODE=redirect",
      reasons,
      envPopupFlag,
      pendingRedirectReturn: true,
      userAgent,
    };
  }

  if (options?.popupBlockedFallback) {
    reasons.push("Popup blocked by browser (error popup_blocked_by_browser)");
    reasons.push("Falling back to redirect flow");
    return {
      mode: "redirect",
      modeLabel: "MODE=redirect",
      reasons,
      envPopupFlag,
      pendingRedirectReturn,
      userAgent,
    };
  }

  if (options?.initUsePopup === true) {
    reasons.push("AppleID.auth.init called with usePopup: true");
    if (envPopupFlag) {
      reasons.push('NEXT_PUBLIC_APPLE_JS_USE_POPUP=true');
    } else {
      reasons.push("usePopup:true despite NEXT_PUBLIC_APPLE_JS_USE_POPUP not being true (popup-blocked fallback path)");
    }
    return {
      mode: "popup",
      modeLabel: "MODE=popup",
      reasons,
      envPopupFlag,
      pendingRedirectReturn,
      userAgent,
    };
  }

  if (options?.initUsePopup === false) {
    reasons.push("AppleID.auth.init called with usePopup: false");
    if (!envPopupFlag) {
      reasons.push('NEXT_PUBLIC_APPLE_JS_USE_POPUP is not "true" — redirect is the default runtime mode');
    } else {
      reasons.push("usePopup:false despite NEXT_PUBLIC_APPLE_JS_USE_POPUP=true (unexpected)");
    }
    return {
      mode: "redirect",
      modeLabel: "MODE=redirect",
      reasons,
      envPopupFlag,
      pendingRedirectReturn,
      userAgent,
    };
  }

  if (!envPopupFlag) {
    reasons.push('NEXT_PUBLIC_APPLE_JS_USE_POPUP is not set to "true"');
    reasons.push("Redirect mode is the default (popup is opt-in via env flag)");
    return {
      mode: "redirect",
      modeLabel: "MODE=redirect",
      reasons,
      envPopupFlag,
      pendingRedirectReturn,
      userAgent,
    };
  }

  reasons.push('NEXT_PUBLIC_APPLE_JS_USE_POPUP=true');
  reasons.push("Popup mode selected at sign-in entry");
  return {
    mode: "popup",
    modeLabel: "MODE=popup",
    reasons,
    envPopupFlag,
    pendingRedirectReturn,
    userAgent,
  };
}

export function logAppleJsModeDecision(decision: AppleJsModeDecision, failurePoint: string): void {
  console.log("[APPLE SDK FORENSIC]", decision.modeLabel);
  console.log("[APPLE SDK FORENSIC]", "# Mode decision", safeAppleSdkJson({ failurePoint, ...decision }));
  if (decision.mode === "redirect") {
    console.log("[APPLE SDK FORENSIC]", "# Popup bypass reason", decision.reasons.join(" → "));
  }
  logAppleJs("runtime-mode", { failurePoint, ...decision });
}

export function logAppleAuthInitPayload(config: AppleAuthInitConfig, failurePoint: string): void {
  const decision = resolveAppleJsModeDecision({ initUsePopup: config.usePopup });
  logAppleJsModeDecision(decision, failurePoint);

  const payload = {
    clientId: config.clientId,
    redirectURI: config.redirectURI,
    scope: config.scope,
    state: config.state,
    nonce: config.nonce,
    usePopup: config.usePopup,
  };

  console.log("[APPLE SDK FORENSIC]", "# AppleID.auth.init payload", safeAppleSdkJson(payload));
  console.log("[APPLE SDK FORENSIC]", "# Exact Failure Point", failurePoint);

  const clientIdIssue = getAppleWebClientIdMisconfigurationIssue();
  if (clientIdIssue) {
    console.error("[APPLE SDK FORENSIC]", "# CLIENT ID MISCONFIGURATION", clientIdIssue);
    console.error("[APPLE SDK FORENSIC FULL]", safeAppleSdkJson({ clientIdIssue, payload }));
  }

  logAppleJs("auth-init-payload", { failurePoint, mode: decision.modeLabel, ...payload });
}

export function logAppleAuthSignInResult(
  result: unknown,
  failurePoint: string,
  mode: AppleJsRuntimeMode,
): { tokenIssuancePhase: AppleTokenIssuancePhase } {
  const tokenIssuancePhase = classifyAppleTokenIssuancePhase(result, "signIn-resolve");
  const fields = extractAppleSignInResultFields(result);

  console.log("[APPLE SDK FORENSIC]", mode === "popup" ? "MODE=popup" : "MODE=redirect");
  console.log("[APPLE SDK FORENSIC]", "# AppleID.auth.signIn result", safeAppleSdkJson(fields));
  console.log("[APPLE SDK FORENSIC]", "# authorization.id_token", fields["authorization.id_token"]);
  console.log("[APPLE SDK FORENSIC]", "# authorization.code", fields["authorization.code"]);
  console.log("[APPLE SDK FORENSIC]", "# authorization.state", fields["authorization.state"]);
  console.log("[APPLE SDK FORENSIC]", "# user", safeAppleSdkJson(fields.user));
  console.log("[APPLE SDK FORENSIC]", "# Token issuance phase", tokenIssuancePhase);
  console.log("[APPLE SDK FORENSIC]", "# Exact Failure Point", failurePoint);
  logAppleSdkForensicFull("AppleID.auth.signIn result", fields);

  logAppleJs("auth-signIn-result", {
    failurePoint,
    mode,
    tokenIssuancePhase,
    fieldsJson: safeAppleSdkJson(fields),
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
    for (const key of Object.getOwnPropertyNames(error)) {
      payload[key] = extra[key];
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
    payloadJson: safeAppleSdkJson(error),
    tokenIssuancePhase,
  };
}

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

  console.error("[APPLE SDK FORENSIC]");
  console.error("# Apple JS SDK error object", capture.payloadJson);
  console.error("# Apple JS SDK error code", capture.errorCode ?? "(none)");
  console.error("# Apple JS SDK error message", capture.message ?? "(none)");
  console.error("# Token issuance phase", capture.tokenIssuancePhase);
  console.error("# Exact Failure Point", capture.failurePoint);
  if (extra && Object.keys(extra).length > 0) {
    console.error("# Extra", safeAppleSdkJson(extra));
  }
  console.error("[APPLE SDK FORENSIC FULL]", capture.payloadJson);
  logAppleSdkForensicFull(failurePoint, { error, extra: extra ?? null, capture });

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

  if (isSuccess) {
    const fields = extractAppleSignInResultFields(detail);
    console.log("[APPLE SDK FORENSIC]", "# AppleID.auth.signIn result (document event)", safeAppleSdkJson(fields));
    console.log("[APPLE SDK FORENSIC]", "# authorization.id_token", fields["authorization.id_token"]);
    console.log("[APPLE SDK FORENSIC]", "# authorization.code", fields["authorization.code"]);
    console.log("[APPLE SDK FORENSIC]", "# authorization.state", fields["authorization.state"]);
    console.log("[APPLE SDK FORENSIC]", "# user", safeAppleSdkJson(fields.user));
    console.log("[APPLE SDK FORENSIC]", "# Token issuance phase", tokenIssuancePhase);
    console.log("[APPLE SDK FORENSIC]", "# Exact Failure Point", failurePoint);
    logAppleSdkForensicFull("AppleIDSignInOnSuccess", { eventType: event.type, fields, extra: extra ?? null });
  } else {
    const payload = isRecord(detail) ? detail : { type: event.type, detail };
    const errorCode = resolveAppleSdkErrorCode(payload);
    const message = resolveAppleSdkErrorMessage(payload, detail);

    console.error("[APPLE SDK FORENSIC]");
    console.error("# Apple JS SDK error object", safeAppleSdkJson(detail ?? { type: event.type }));
    console.error("# Apple JS SDK error code", errorCode ?? "(none)");
    console.error("# Apple JS SDK error message", message ?? "(none)");
    console.error("# Token issuance phase", tokenIssuancePhase);
    console.error("# Exact Failure Point", failurePoint);
    if (extra && Object.keys(extra).length > 0) {
      console.error("# Extra", safeAppleSdkJson(extra));
    }
    console.error("[APPLE SDK FORENSIC FULL]", safeAppleSdkJson(detail ?? { type: event.type, extra }));
    logAppleSdkForensicFull(failurePoint, { eventType: event.type, detail, extra: extra ?? null });
  }

  logAppleJs("sdk-forensic-event", {
    failurePoint,
    eventType: event.type,
    tokenIssuancePhase,
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
    };

    console.log("[APPLE SDK FORENSIC]", "# Popup postMessage", safeAppleSdkJson(payload));
    logAppleJs("popup-postmessage", payload);
  };

  window.addEventListener("message", handler);
  return () => window.removeEventListener("message", handler);
}

export function isAppleAuthSignInPromise(value: unknown): value is Promise<unknown> {
  return (
    value != null &&
    (typeof value === "object" || typeof value === "function") &&
    typeof (value as Promise<unknown>).then === "function"
  );
}

export async function invokeAppleAuthSignIn(
  failurePointPrefix: string,
  mode: AppleJsRuntimeMode,
): Promise<{ authorization: { id_token?: string; code?: string; state?: string }; user?: unknown } | void> {
  const failurePoint = `${failurePointPrefix}:AppleID.auth.signIn()`;
  const modeLabel = mode === "popup" ? "MODE=popup" : "MODE=redirect";

  console.log("[APPLE SDK FORENSIC]", modeLabel);
  console.log("[APPLE SDK FORENSIC]", "# signIn() call", safeAppleSdkJson({ failurePointPrefix, failurePoint, mode }));

  logAppleJs("signIn-call-start", { failurePointPrefix, failurePoint, mode, modeLabel });

  const signInReturn = window.AppleID!.auth.signIn();
  const isPromise = isAppleAuthSignInPromise(signInReturn);

  console.log(
    "[APPLE SDK FORENSIC]",
    "# AppleID.auth.signIn() return shape",
    safeAppleSdkJson({
      mode,
      typeofReturn: typeof signInReturn,
      isPromise,
      returnValue: signInReturn ?? null,
    }),
  );

  if (mode === "redirect" || !isPromise) {
    console.log(
      "[APPLE SDK FORENSIC]",
      "# AppleID.auth.signIn result",
      safeAppleSdkJson({
        mode: "redirect",
        note: "Redirect flow: signIn() does not return a Promise — SDK opens Apple UI / navigates",
        typeofReturn: typeof signInReturn,
        isPromise,
        returnValue: signInReturn ?? null,
      }),
    );
    logAppleJs("signIn-call-redirect-no-promise", {
      failurePoint,
      mode,
      typeofReturn: typeof signInReturn,
      isPromise,
    });
    return;
  }

  const signInPromise = signInReturn;

  signInPromise.catch((error) => {
    logAppleSdkForensic(`${failurePoint}:promise-reject-tap`, error, { mode, modeLabel }, "before_token_issuance");
  });

  try {
    const result = (await signInPromise) as {
      authorization: { id_token?: string; code?: string; state?: string };
      user?: unknown;
    };
    const { tokenIssuancePhase } = logAppleAuthSignInResult(result, failurePoint, mode);
    logAppleJs("signIn-call-resolve", {
      failurePointPrefix,
      failurePoint,
      mode,
      modeLabel,
      tokenIssuancePhase,
      fields: extractAppleSignInResultFields(result),
    });
    return result;
  } catch (error) {
    logAppleSdkForensic(`${failurePoint}:promise-reject`, error, { mode, modeLabel }, "before_token_issuance");
    throw error;
  }
}
