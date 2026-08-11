import { userCopy } from "@/lib/user-copy";

/**
 * OpenRouter / AI SDK sometimes surface failures as plain objects
 * (`{ code, message, metadata }`) rather than `Error`. `String(obj)` becomes
 * `"[object Object]"`, which hides rate-limit and capacity signals.
 */
export function providerErrorText(error: unknown): string {
  if (error == null) return "";
  if (typeof error === "string") return error;
  if (error instanceof Error) {
    const cause =
      "cause" in error && error.cause != null ? providerErrorText(error.cause) : "";
    return [error.message, cause].filter(Boolean).join(" ");
  }
  if (typeof error === "object") {
    const record = error as Record<string, unknown>;
    const parts: string[] = [];
    if (typeof record.message === "string") parts.push(record.message);
    if (typeof record.code === "string" || typeof record.code === "number") {
      parts.push(String(record.code));
    }
    if (record.metadata && typeof record.metadata === "object") {
      const meta = record.metadata as Record<string, unknown>;
      if (typeof meta.error_type === "string") parts.push(meta.error_type);
    }
    if (record.error != null) parts.push(providerErrorText(record.error));
    if (record.cause != null) parts.push(providerErrorText(record.cause));
    if (parts.length > 0) return parts.join(" ");
  }
  return String(error);
}

/** Never leak a stack trace or a provider URL into the UI stream. */
export function streamErrorMessage(error: unknown): string {
  const raw = providerErrorText(error);
  if (
    /rate.?limit|429|too many requests|resourceexhausted|provider_unavailable|worker .+ request limit|502/i.test(
      raw,
    )
  ) {
    return userCopy.ai.errorBusy;
  }
  if (/timeout|aborted|ETIMEDOUT|ECONNRESET/i.test(raw)) {
    return userCopy.ai.errorTimeout;
  }
  return userCopy.ai.errorGeneric;
}
