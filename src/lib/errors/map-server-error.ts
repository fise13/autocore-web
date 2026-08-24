import { getActiveUserCopyLocale } from "@/lib/user-copy";

export function mapServerError(error: unknown, fallback?: string): string {
  const isEn = getActiveUserCopyLocale() === "en";
  const resolvedFallback =
    fallback ??
    (isEn ? "Could not complete the operation" : "Не удалось выполнить операцию");
  if (!(error instanceof Error)) return resolvedFallback;

  const message = error.message;

  if (
    message.includes("ENOENT") ||
    message.includes("FIREBASE_SERVICE_ACCOUNT") ||
    message.includes("Firebase Admin не настроен") ||
    message.includes("service account")
  ) {
    return isEn
      ? "PDF and warranty need Firebase Admin: locally set FIREBASE_SERVICE_ACCOUNT_PATH; on Vercel use a full FIREBASE_SERVICE_ACCOUNT_JSON (no placeholder “…”)."
      : "PDF и гарантия требуют Firebase Admin: локально — FIREBASE_SERVICE_ACCOUNT_PATH; на Vercel — полный FIREBASE_SERVICE_ACCOUNT_JSON (без placeholder «…»).";
  }

  return message || resolvedFallback;
}
