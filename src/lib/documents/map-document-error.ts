import { userCopy } from "@/lib/user-copy";

export function mapDocumentError(error: unknown, fallback?: string): string {
  const resolvedFallback = fallback ?? userCopy.documents.errors.fallback;
  if (!(error instanceof Error)) return resolvedFallback;

  const message = error.message;
  const errors = userCopy.documents.errors;

  if (
    message.includes("FIREBASE_SERVICE_ACCOUNT") ||
    message.includes("Firebase Admin is not configured") ||
    message.includes("service account") ||
    message.includes("ENOENT")
  ) {
    return errors.firebaseAdmin;
  }

  if (
    message.includes("Chrome was not found") ||
    message.includes("PUPPETEER") ||
    message.includes("@sparticuz/chromium") ||
    message.includes("input directory")
  ) {
    return errors.pdfGenerator;
  }

  if (
    message.includes("bucket does not exist") ||
    message.includes("Storage bucket") ||
    message.includes("FIREBASE_STORAGE_BUCKET")
  ) {
    return errors.storage;
  }

  if (
    message.includes("ERR_CONNECTION_REFUSED") ||
    message.includes("ECONNREFUSED") ||
    message.includes("Страница рендера PDF недоступна")
  ) {
    return errors.renderUnavailable;
  }

  if (
    message.includes("Load failed") ||
    message.includes("Failed to fetch") ||
    message.includes("NetworkError") ||
    message.includes("CORS")
  ) {
    return errors.network;
  }

  if (message.includes("пустым") || message.includes("не содержит данных для PDF")) {
    return errors.emptyPdf;
  }

  return message || resolvedFallback;
}
