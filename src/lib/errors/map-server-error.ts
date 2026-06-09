export function mapServerError(error: unknown, fallback = "Не удалось выполнить операцию"): string {
  if (!(error instanceof Error)) return fallback;

  const message = error.message;

  if (
    message.includes("ENOENT") ||
    message.includes("FIREBASE_SERVICE_ACCOUNT") ||
    message.includes("Firebase Admin не настроен") ||
    message.includes("service account")
  ) {
    return "Firebase Admin не настроен. Добавьте ключ сервисного аккаунта в FIREBASE_SERVICE_ACCOUNT_PATH и перезапустите сервер.";
  }

  return message || fallback;
}
