const MAX_LOGO_BYTES = 2 * 1024 * 1024;

const EXTENSION_BY_TYPE: Record<string, string> = {
  "image/png": "png",
  "image/jpeg": "jpg",
  "image/jpg": "jpg",
  "image/webp": "webp",
  "image/svg+xml": "svg",
};

const TYPE_BY_EXTENSION: Record<string, string> = {
  png: "image/png",
  jpg: "image/jpeg",
  jpeg: "image/jpeg",
  webp: "image/webp",
  svg: "image/svg+xml",
};

export function inferLogoContentType(type: string, fileName?: string): string {
  const normalizedType = type.trim().toLowerCase();
  if (normalizedType && normalizedType !== "application/octet-stream" && EXTENSION_BY_TYPE[normalizedType]) {
    return normalizedType;
  }

  const extension = fileName?.split(".").pop()?.trim().toLowerCase() ?? "";
  return TYPE_BY_EXTENSION[extension] ?? normalizedType;
}

export function assertLogoUpload(file: { size: number; type: string; name?: string }): {
  extension: string;
  contentType: string;
} {
  if (file.size <= 0) {
    throw new Error("Файл пустой");
  }
  if (file.size > MAX_LOGO_BYTES) {
    throw new Error("Файл слишком большой");
  }

  const contentType = inferLogoContentType(file.type, file.name);
  const extension = EXTENSION_BY_TYPE[contentType];
  if (!extension) {
    throw new Error("Неправильный формат");
  }

  return { extension, contentType };
}

export function buildFirebaseStorageDownloadUrl(
  bucketName: string,
  storagePath: string,
  downloadToken: string,
): string {
  return `https://firebasestorage.googleapis.com/v0/b/${bucketName}/o/${encodeURIComponent(storagePath)}?alt=media&token=${downloadToken}`;
}

function readErrorMessage(error: unknown): string {
  if (error instanceof Error) return error.message;
  if (error && typeof error === "object" && "message" in error) {
    return String((error as { message?: unknown }).message ?? "");
  }
  return "";
}

function readErrorCode(error: unknown): number | string | undefined {
  if (!error || typeof error !== "object") return undefined;
  const record = error as { code?: unknown; statusCode?: unknown; response?: { statusCode?: unknown } };
  if (typeof record.code === "number" || typeof record.code === "string") return record.code;
  if (typeof record.statusCode === "number") return record.statusCode;
  if (typeof record.response?.statusCode === "number") return record.response.statusCode;
  return undefined;
}

export function isStorageBucketMissingError(error: unknown): boolean {
  const code = readErrorCode(error);
  if (code === 404 || code === "404") return true;

  const message = readErrorMessage(error);
  if (/bucket does not exist|storage bucket.*не найден|notFound/i.test(message)) return true;

  if (error && typeof error === "object" && "errors" in error) {
    const nested = (error as { errors?: unknown }).errors;
    if (Array.isArray(nested)) {
      return nested.some((entry) => isStorageBucketMissingError(entry));
    }
  }

  if (error && typeof error === "object" && "response" in error) {
    return isStorageBucketMissingError((error as { response?: unknown }).response);
  }

  return false;
}
