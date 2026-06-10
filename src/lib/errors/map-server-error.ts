export function mapServerError(error: unknown, fallback = "Не удалось выполнить операцию"): string {
  if (!(error instanceof Error)) return fallback;

  const message = error.message;

  if (
    message.includes("ENOENT") ||
    message.includes("FIREBASE_SERVICE_ACCOUNT") ||
    message.includes("Firebase Admin не настроен") ||
    message.includes("service account")
  ) {
    return "PDF и гарантия требуют Firebase Admin: локально — FIREBASE_SERVICE_ACCOUNT_PATH; на Vercel — полный FIREBASE_SERVICE_ACCOUNT_JSON (без placeholder «...»).";
  }

  return message || fallback;
}
