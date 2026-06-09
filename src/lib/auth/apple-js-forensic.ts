import { logAppleJs } from "@/lib/auth/apple-auth-log";

export type AppleSdkForensicCapture = {
  failurePoint: string;
  rawError: unknown;
  errorCode: string | null;
  errorField: unknown;
  message: string | null;
  payload: Record<string, unknown>;
  payloadJson: string;
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

export function captureAppleSdkError(error: unknown): Omit<AppleSdkForensicCapture, "failurePoint"> {
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

  const errorCode =
    typeof payload.code === "string"
      ? payload.code
      : typeof payload.code === "number"
        ? String(payload.code)
        : null;

  const message =
    typeof payload.message === "string"
      ? payload.message
      : error instanceof Error
        ? error.message
        : null;

  return {
    rawError: error,
    errorCode,
    errorField: payload.error ?? null,
    message,
    payload,
    payloadJson: safeAppleSdkJson(payload),
  };
}

/** Always-on forensic log for Apple JS SDK runtime errors (not gated by authDebug). */
export function logAppleSdkForensic(
  failurePoint: string,
  error: unknown,
  extra?: Record<string, unknown>,
): AppleSdkForensicCapture {
  const capture: AppleSdkForensicCapture = {
    failurePoint,
    ...captureAppleSdkError(error),
  };

  console.warn("[APPLE SDK FORENSIC]");
  console.warn("# Raw Apple SDK Error", capture.rawError);
  console.warn("# Apple Error Code", capture.errorCode ?? "(none)");
  console.warn("# error.error", capture.errorField ?? "(none)");
  console.warn("# error.message", capture.message ?? "(none)");
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

  console.warn("[APPLE SDK FORENSIC]");
  console.warn("# Raw Apple SDK Error", detail ?? event);
  console.warn("# Apple Error Code", isRecord(detail) && detail.code != null ? String(detail.code) : "(none)");
  console.warn("# error.error", isRecord(detail) ? (detail.error ?? "(none)") : "(none)");
  console.warn(
    "# error.message",
    isRecord(detail) && typeof detail.message === "string" ? detail.message : "(none)",
  );
  console.warn("# Apple Error Payload", safeAppleSdkJson(detail ?? { type: event.type }));
  console.warn("# Exact Failure Point", failurePoint);
  if (extra && Object.keys(extra).length > 0) {
    console.warn("# Extra", safeAppleSdkJson(extra));
  }

  logAppleJs("sdk-forensic-event", {
    failurePoint,
    eventType: event.type,
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
  logAppleJs("signIn-call-start", { failurePointPrefix });

  try {
    const result = await window.AppleID!.auth.signIn();
    logAppleJs("signIn-call-resolve", {
      failurePointPrefix,
      hasAuthorization: Boolean(result?.authorization),
      authorizationKeys: result?.authorization ? Object.keys(result.authorization) : [],
      hasUser: Boolean(result?.user),
      resultJson: safeAppleSdkJson(result),
    });
    return result;
  } catch (error) {
    logAppleSdkForensic(`${failurePointPrefix}:AppleID.auth.signIn():promise-reject`, error);
    throw error;
  }
}
