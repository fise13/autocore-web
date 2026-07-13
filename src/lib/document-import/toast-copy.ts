import type { DocumentImportJob } from "@/domain/document-import";

const UUID_FILE_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\.[a-z0-9]+$/i;

export function formatByteSize(bytes?: number): string | null {
  if (!bytes || bytes <= 0) return null;
  if (bytes < 1024) return `${bytes} Б`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} КБ`;
  return `${(bytes / (1024 * 1024)).toFixed(1).replace(/\.0$/, "")} МБ`;
}

export function mediaKindLabel(contentType: string): string {
  if (contentType.startsWith("image/")) return "Фото";
  if (contentType === "application/pdf") return "PDF";
  return "Файл";
}

/** Human copy for toast — never dump phone UUIDs as the description. */
export function formatDocumentImportToastCopy(job: DocumentImportJob): {
  title: string;
  description: string;
} {
  const kind = mediaKindLabel(job.contentType);
  const size = formatByteSize(job.byteSize);
  const rawName = job.fileName?.trim() ?? "";
  const isUuidName = !rawName || UUID_FILE_RE.test(rawName);

  if (job.status === "pending") {
    return {
      title: `${kind} с телефона`,
      description: size ? `Загружается · ${size}` : "Загружается, скоро будет готово",
    };
  }

  if (isUuidName) {
    return {
      title: `${kind} с телефона`,
      description: size ? `Готово к просмотру · ${size}` : "Готово к просмотру",
    };
  }

  const shortName = rawName.length > 42 ? `${rawName.slice(0, 40)}…` : rawName;
  return {
    title: `${kind} с телефона`,
    description: size ? `${shortName} · ${size}` : shortName,
  };
}
