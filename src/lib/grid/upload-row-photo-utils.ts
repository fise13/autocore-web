const MAX_ROW_PHOTO_BYTES = 5 * 1024 * 1024;

const EXTENSION_BY_TYPE: Record<string, string> = {
  "image/png": "png",
  "image/jpeg": "jpg",
  "image/jpg": "jpg",
  "image/webp": "webp",
};

const TYPE_BY_EXTENSION: Record<string, string> = {
  png: "image/png",
  jpg: "image/jpeg",
  jpeg: "image/jpeg",
  webp: "image/webp",
};

export type RowPhotoEntityKind = "motor" | "warehouse" | "specific";

export function inferRowPhotoContentType(type: string, fileName?: string): string {
  const normalizedType = type.trim().toLowerCase();
  if (normalizedType && normalizedType !== "application/octet-stream" && EXTENSION_BY_TYPE[normalizedType]) {
    return normalizedType === "image/jpg" ? "image/jpeg" : normalizedType;
  }

  const extension = fileName?.split(".").pop()?.trim().toLowerCase() ?? "";
  return TYPE_BY_EXTENSION[extension] ?? normalizedType;
}

export function assertRowPhotoUpload(file: { size: number; type: string; name?: string }): {
  extension: string;
  contentType: string;
} {
  if (file.size <= 0) {
    throw new Error("Empty file");
  }
  if (file.size > MAX_ROW_PHOTO_BYTES) {
    throw new Error("File is too large (max 5 MB)");
  }

  const contentType = inferRowPhotoContentType(file.type, file.name);
  const extension = EXTENSION_BY_TYPE[contentType];
  if (!extension) {
    throw new Error("Unsupported image format");
  }

  return { extension, contentType };
}

export function buildRowPhotoStoragePath(
  companyId: string,
  entityKind: RowPhotoEntityKind,
  entityId: string,
  fileId: string,
  extension: string,
): string {
  return `companies/${companyId}/row-photos/${entityKind}/${entityId}/${fileId}.${extension}`;
}

export function isRowPhotoEntityKind(value: string): value is RowPhotoEntityKind {
  return value === "motor" || value === "warehouse" || value === "specific";
}
