import type { FileUIPart } from "ai";

/** Raw file cap before we try to shrink images. */
export const CHAT_FILE_MAX_BYTES = 3 * 1024 * 1024;
/** After JPEG shrink — keeps the assistant JSON body under typical 4.5 MB limits. */
export const CHAT_IMAGE_MAX_BYTES = 700_000;
export const CHAT_FILE_MAX_COUNT = 4;
const IMAGE_MAX_EDGE = 1600;
const IMAGE_QUALITY = 0.82;

const DOCUMENT_TYPES = new Set([
  "application/pdf",
  "text/plain",
  "text/csv",
  "application/vnd.ms-excel",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
]);

const EXTENSION_TYPES: Record<string, string> = {
  pdf: "application/pdf",
  txt: "text/plain",
  csv: "text/csv",
  xls: "application/vnd.ms-excel",
  xlsx: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  png: "image/png",
  jpg: "image/jpeg",
  jpeg: "image/jpeg",
  webp: "image/webp",
  gif: "image/gif",
  heic: "image/heic",
  heif: "image/heif",
};

export type ChatFileRejectReason = "type" | "size" | "limit";

export function chatFileAcceptAttr(): string {
  return "image/*,.pdf,.txt,.csv,.xls,.xlsx,application/pdf,text/plain,text/csv";
}

export function sniffChatFileType(file: File): string {
  if (file.type && file.type !== "application/octet-stream") return file.type;
  const ext = file.name.split(".").pop()?.toLowerCase();
  return (ext && EXTENSION_TYPES[ext]) || file.type || "";
}

export function isAllowedChatFile(file: File): boolean {
  const type = sniffChatFileType(file);
  if (type.startsWith("image/")) return true;
  return DOCUMENT_TYPES.has(type);
}

export function rejectChatFile(file: File, already: number): ChatFileRejectReason | null {
  if (already >= CHAT_FILE_MAX_COUNT) return "limit";
  if (!isAllowedChatFile(file)) return "type";
  if (file.size > CHAT_FILE_MAX_BYTES) return "size";
  return null;
}

export async function fileToDataUrl(file: Blob): Promise<string | null> {
  return new Promise((resolve) => {
    const reader = new FileReader();
    reader.onloadend = () => resolve(typeof reader.result === "string" ? reader.result : null);
    reader.onerror = () => resolve(null);
    reader.readAsDataURL(file);
  });
}

async function shrinkImage(file: File): Promise<File> {
  if (typeof createImageBitmap !== "function") return file;
  let bitmap: ImageBitmap;
  try {
    bitmap = await createImageBitmap(file);
  } catch {
    return file;
  }
  try {
    const longest = Math.max(bitmap.width, bitmap.height);
    const scale = longest > IMAGE_MAX_EDGE ? IMAGE_MAX_EDGE / longest : 1;
    if (scale === 1 && file.size <= CHAT_IMAGE_MAX_BYTES && file.type === "image/jpeg") {
      return file;
    }
    const width = Math.max(1, Math.round(bitmap.width * scale));
    const height = Math.max(1, Math.round(bitmap.height * scale));
    const canvas = document.createElement("canvas");
    canvas.width = width;
    canvas.height = height;
    const context = canvas.getContext("2d");
    if (!context) return file;
    context.drawImage(bitmap, 0, 0, width, height);
    const blob = await new Promise<Blob | null>((resolve) => {
      canvas.toBlob(resolve, "image/jpeg", IMAGE_QUALITY);
    });
    if (!blob) return file;
    const name = file.name.replace(/\.[^.]+$/, "") || "photo";
    return new File([blob], `${name}.jpg`, { type: "image/jpeg" });
  } finally {
    bitmap.close();
  }
}

export async function toChatFilePart(file: File): Promise<FileUIPart | null> {
  const mediaType = sniffChatFileType(file);
  const prepared = mediaType.startsWith("image/") ? await shrinkImage(file) : file;
  if (prepared.size > CHAT_FILE_MAX_BYTES) return null;
  const url = await fileToDataUrl(prepared);
  if (!url) return null;
  return {
    type: "file",
    url,
    mediaType: prepared.type || mediaType || "application/octet-stream",
    filename: file.name,
  };
}
