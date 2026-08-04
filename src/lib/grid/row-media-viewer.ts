import type { RowPhotoEntityKind } from "@/lib/grid/upload-row-photo-utils";
import { isRowPhotoEntityKind } from "@/lib/grid/upload-row-photo-utils";

export type RowMediaViewerPayload = {
  urls: string[];
  entityKind: RowPhotoEntityKind;
  entityId: string;
  title?: string;
  returnTo?: string;
};

const STORAGE_PREFIX = "autocore:row-media:";

export function rowMediaViewerStorageKey(entityKind: string, entityId: string): string {
  return `${STORAGE_PREFIX}${entityKind}:${entityId}`;
}

export function stashRowMediaViewerPayload(payload: RowMediaViewerPayload): void {
  if (typeof window === "undefined") return;
  const key = rowMediaViewerStorageKey(payload.entityKind, payload.entityId);
  sessionStorage.setItem(key, JSON.stringify(payload));
}

export function readRowMediaViewerPayload(
  entityKind: string,
  entityId: string,
): RowMediaViewerPayload | null {
  if (typeof window === "undefined") return null;
  const raw = sessionStorage.getItem(rowMediaViewerStorageKey(entityKind, entityId));
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw) as RowMediaViewerPayload;
    if (!Array.isArray(parsed.urls) || !parsed.entityId) return null;
    if (!isRowPhotoEntityKind(String(parsed.entityKind))) return null;
    return {
      ...parsed,
      urls: parsed.urls.map(String).filter(Boolean),
    };
  } catch {
    return null;
  }
}

export function buildRowMediaViewerHref(input: {
  entityKind: RowPhotoEntityKind;
  entityId: string;
  index?: number;
}): string {
  const params = new URLSearchParams();
  if (input.index && input.index > 0) {
    params.set("i", String(input.index));
  }
  const query = params.toString();
  return `/media/${input.entityKind}/${encodeURIComponent(input.entityId)}${query ? `?${query}` : ""}`;
}

/** Extract Storage object path from a Firebase download URL. */
export function storagePathFromFirebaseMediaUrl(url: string): string | null {
  try {
    const parsed = new URL(url);
    if (parsed.hostname === "firebasestorage.googleapis.com") {
      const match = parsed.pathname.match(/\/o\/(.+)$/);
      if (!match?.[1]) return null;
      return decodeURIComponent(match[1]);
    }
    if (parsed.hostname === "storage.googleapis.com") {
      const parts = parsed.pathname.replace(/^\//, "").split("/");
      if (parts.length < 2) return null;
      return decodeURIComponent(parts.slice(1).join("/"));
    }
  } catch {
    return null;
  }
  return null;
}

export function filenameFromMediaUrl(url: string, index: number): string {
  const storagePath = storagePathFromFirebaseMediaUrl(url);
  const fromPath = storagePath?.split("/").pop()?.trim();
  if (fromPath) return fromPath;
  try {
    const pathname = new URL(url).pathname;
    const last = pathname.split("/").pop()?.trim();
    if (last) return decodeURIComponent(last);
  } catch {
    // ignore
  }
  return `media-${index + 1}`;
}

export function rowPhotoFileApiUrl(mediaUrl: string, options?: { download?: boolean; filename?: string }): string {
  const params = new URLSearchParams();
  params.set("url", mediaUrl);
  if (options?.download) params.set("download", "1");
  if (options?.filename) params.set("filename", options.filename);
  return `/api/inventory/row-photo/file?${params.toString()}`;
}
