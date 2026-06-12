export function mapDocumentError(error: unknown, fallback = "Не удалось выполнить операцию"): string {
  if (!(error instanceof Error)) return fallback;

  const message = error.message;

  if (
    message.includes("FIREBASE_SERVICE_ACCOUNT") ||
    message.includes("Firebase Admin не настроен") ||
    message.includes("service account") ||
    message.includes("ENOENT")
  ) {
    return "PDF требует Firebase Admin. Локально: *-firebase-adminsdk-*.json в корне + FIREBASE_SERVICE_ACCOUNT_PATH в .env.local, затем перезапуск dev-сервера. На Vercel: FIREBASE_SERVICE_ACCOUNT_JSON (полный JSON одной строкой) + FIREBASE_STORAGE_BUCKET, затем redeploy.";
  }

  if (
    message.includes("Chrome не найден") ||
    message.includes("PUPPETEER") ||
    message.includes("@sparticuz/chromium") ||
    message.includes("input directory")
  ) {
    return "Не удалось запустить генератор PDF на сервере. Попробуйте через минуту или обратитесь в поддержку.";
  }

  if (
    message.includes("bucket does not exist") ||
    message.includes("Storage bucket") ||
    message.includes("FIREBASE_STORAGE_BUCKET")
  ) {
    return "Firebase Storage не настроен. Включите Storage в Firebase Console (Build → Storage) или укажите FIREBASE_STORAGE_BUCKET в .env.local. PDF можно скачать кнопкой «PDF» — файл генерируется по запросу.";
  }

  return message || fallback;
}
