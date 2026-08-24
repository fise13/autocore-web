const MAX_IMAGE_BYTES = 10 * 1024 * 1024;
const MAX_VIDEO_BYTES = 100 * 1024 * 1024;
/** Soft cap so one row cannot balloon Firestore docs indefinitely. */
export const MAX_ROW_MEDIA_ITEMS = 40;

const EXTENSION_BY_TYPE: Record<string, string> = {
  "image/png": "png",
  "image/jpeg": "jpg",
  "image/jpg": "jpg",
  "image/webp": "webp",
  "image/gif": "gif",
  "image/heic": "heic",
  "image/heif": "heif",
  "video/mp4": "mp4",
  "video/webm": "webm",
  "video/quicktime": "mov",
  "video/x-m4v": "m4v",
};

const TYPE_BY_EXTENSION: Record<string, string> = {
  png: "image/png",
  jpg: "image/jpeg",
  jpeg: "image/jpeg",
  webp: "image/webp",
  gif: "image/gif",
  heic: "image/heic",
  heif: "image/heif",
  mp4: "video/mp4",
  webm: "video/webm",
  mov: "video/quicktime",
  m4v: "video/x-m4v",
};

const VIDEO_EXTENSIONS = new Set(["mp4", "webm", "mov", "m4v"]);

export type RowPhotoEntityKind = "motor" | "warehouse" | "specific" | "used-part";

export function inferRowPhotoContentType(type: string, fileName?: string): string {
  const normalizedType = type.trim().toLowerCase();
  if (normalizedType && normalizedType !== "application/octet-stream" && EXTENSION_BY_TYPE[normalizedType]) {
    return normalizedType === "image/jpg" ? "image/jpeg" : normalizedType;
  }

  const extension = fileName?.split(".").pop()?.trim().toLowerCase() ?? "";
  return TYPE_BY_EXTENSION[extension] ?? normalizedType;
}

export function isVideoContentType(contentType: string): boolean {
  return contentType.trim().toLowerCase().startsWith("video/");
}

export function isVideoMediaUrl(url: string): boolean {
  const trimmed = url.trim();
  if (!trimmed) return false;
  if (/[?&](?:contentType|mime)=video\//i.test(trimmed)) return true;
  try {
    const pathname = new URL(trimmed).pathname.toLowerCase();
    const extension = pathname.split(".").pop() ?? "";
    return VIDEO_EXTENSIONS.has(extension);
  } catch {
    const extension = trimmed.split("?")[0]?.split(".").pop()?.toLowerCase() ?? "";
    return VIDEO_EXTENSIONS.has(extension);
  }
}

export function assertRowPhotoUpload(file: { size: number; type: string; name?: string }): {
  extension: string;
  contentType: string;
  kind: "image" | "video";
} {
  if (file.size <= 0) {
    throw new Error("Empty file");
  }

  const contentType = inferRowPhotoContentType(file.type, file.name);
  const extension = EXTENSION_BY_TYPE[contentType];
  if (!extension) {
    throw new Error("Unsupported media format");
  }

  const kind: "image" | "video" = isVideoContentType(contentType) ? "video" : "image";
  const maxBytes = kind === "video" ? MAX_VIDEO_BYTES : MAX_IMAGE_BYTES;
  if (file.size > maxBytes) {
    throw new Error(
      kind === "video" ? "Video is too large (max 100 MB)" : "Image is too large (max 10 MB)",
    );
  }

  return { extension, contentType, kind };
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
  return value === "motor" || value === "warehouse" || value === "specific" || value === "used-part";
}

export function assertRowMediaCount(currentCount: number, addingCount: number): void {
  if (currentCount + addingCount > MAX_ROW_MEDIA_ITEMS) {
    throw new Error(`Too many attachments (max ${MAX_ROW_MEDIA_ITEMS})`);
  }
}
