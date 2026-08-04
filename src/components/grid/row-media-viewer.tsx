"use client";

import { ArrowLeft, ChevronLeft, ChevronRight, Download, Film, Loader2 } from "lucide-react";
import { doc, getDoc } from "firebase/firestore";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";

import { GridMediaThumb } from "@/components/grid/grid-media-gallery";
import { useAuth } from "@/components/providers/auth-provider";
import { Button } from "@/components/ui/button";
import { getFirebaseAuth, getFirestoreDb } from "@/infrastructure/firebase/client";
import { createInventoryItemRepository } from "@/infrastructure/firestore/inventory-item-repository";
import { normalizeCompanyId } from "@/lib/company-id";
import {
  filenameFromMediaUrl,
  readRowMediaViewerPayload,
  rowPhotoFileApiUrl,
  type RowMediaViewerPayload,
} from "@/lib/grid/row-media-viewer";
import { isRowPhotoEntityKind, isVideoMediaUrl } from "@/lib/grid/upload-row-photo-utils";
import { userCopy } from "@/lib/user-copy";
import { cn } from "@/lib/utils";

const inventoryRepository = createInventoryItemRepository();

async function authToken(): Promise<string> {
  const user = getFirebaseAuth().currentUser;
  if (!user) throw new Error("Not signed in");
  return user.getIdToken();
}

async function downloadViaApi(mediaUrl: string, filename: string): Promise<void> {
  const token = await authToken();
  const response = await fetch(rowPhotoFileApiUrl(mediaUrl, { download: true, filename }), {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!response.ok) {
    const payload = (await response.json().catch(() => ({}))) as { error?: string };
    throw new Error(payload.error || "Download failed");
  }
  const blob = await response.blob();
  const objectUrl = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = objectUrl;
  anchor.download = filename;
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  URL.revokeObjectURL(objectUrl);
}

async function loadUrlsFromFirestore(input: {
  entityKind: string;
  entityId: string;
  uid: string;
  companyId: string;
}): Promise<string[]> {
  if (input.entityKind === "warehouse") {
    const item = await inventoryRepository.getById(input.entityId);
    if (!item || normalizeCompanyId(item.companyId) !== input.companyId) return [];
    return item.imageUrls ?? [];
  }

  if (input.entityKind === "motor") {
    const snapshot = await getDoc(doc(getFirestoreDb(), "users", input.uid, "motors", input.entityId));
    if (!snapshot.exists()) return [];
    const data = snapshot.data() as { companyId?: string; photoUrls?: unknown };
    if (normalizeCompanyId(data.companyId ?? "") !== input.companyId) return [];
    return Array.isArray(data.photoUrls) ? data.photoUrls.map(String).filter(Boolean) : [];
  }

  return [];
}

export function RowMediaViewer() {
  const router = useRouter();
  const params = useParams<{ entityKind: string; entityId: string }>();
  const searchParams = useSearchParams();
  const { profile } = useAuth();
  const copy = userCopy.gridPhotos;

  const entityKind = String(params.entityKind ?? "");
  const entityId = decodeURIComponent(String(params.entityId ?? ""));
  const initialIndex = Math.max(0, Number(searchParams.get("i") ?? "0") || 0);
  const initialIndexRef = useRef(initialIndex);

  const [payload, setPayload] = useState<RowMediaViewerPayload | null>(null);
  const [loading, setLoading] = useState(true);
  const [index, setIndex] = useState(initialIndexRef.current);
  const [busy, setBusy] = useState<"one" | "all" | null>(null);
  const [error, setError] = useState<string | null>(null);

  const companyId = normalizeCompanyId(profile?.companyId);
  const uid = profile?.id ?? "";

  useEffect(() => {
    let cancelled = false;

    async function load() {
      setLoading(true);
      setError(null);

      if (!isRowPhotoEntityKind(entityKind) || !entityId) {
        if (!cancelled) {
          setPayload(null);
          setLoading(false);
          setError(copy.viewerInvalid);
        }
        return;
      }

      const stashed = readRowMediaViewerPayload(entityKind, entityId);
      if (stashed?.urls.length) {
        if (!cancelled) {
          setPayload(stashed);
          setIndex(Math.min(initialIndexRef.current, stashed.urls.length - 1));
          setLoading(false);
        }
        return;
      }

      if (!uid || !companyId) {
        if (!cancelled) {
          setPayload(null);
          setLoading(false);
          setError(copy.galleryEmpty);
        }
        return;
      }

      try {
        const urls = await loadUrlsFromFirestore({ entityKind, entityId, uid, companyId });
        if (cancelled) return;
        if (urls.length === 0) {
          setPayload(null);
          setError(copy.galleryEmpty);
        } else {
          setPayload({
            urls,
            entityKind,
            entityId,
            returnTo:
              entityKind === "warehouse" ? "/warehouse" : entityKind === "motor" ? "/motors" : undefined,
          });
          setIndex(Math.min(initialIndexRef.current, urls.length - 1));
        }
      } catch {
        if (!cancelled) {
          setPayload(null);
          setError(copy.viewerLoadFailed);
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    void load();
    return () => {
      cancelled = true;
    };
  }, [companyId, copy.galleryEmpty, copy.viewerInvalid, copy.viewerLoadFailed, entityId, entityKind, uid]);

  const urls = payload?.urls ?? [];
  const current = urls[index] ?? null;
  const isVideo = current ? isVideoMediaUrl(current) : false;

  const go = useCallback(
    (delta: number) => {
      if (urls.length === 0) return;
      setIndex((currentIndex) => (currentIndex + delta + urls.length) % urls.length);
    },
    [urls.length],
  );

  useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "ArrowLeft") {
        event.preventDefault();
        go(-1);
      } else if (event.key === "ArrowRight") {
        event.preventDefault();
        go(1);
      } else if (event.key === "Escape") {
        event.preventDefault();
        router.push(payload?.returnTo || "/motors");
      }
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [go, payload?.returnTo, router]);

  async function handleDownloadCurrent() {
    if (!current) return;
    setBusy("one");
    setError(null);
    try {
      await downloadViaApi(current, filenameFromMediaUrl(current, index));
    } catch (err) {
      setError(err instanceof Error ? err.message : copy.downloadFailed);
    } finally {
      setBusy(null);
    }
  }

  async function handleDownloadAll() {
    if (urls.length === 0) return;
    setBusy("all");
    setError(null);
    try {
      for (let i = 0; i < urls.length; i += 1) {
        const url = urls[i]!;
        await downloadViaApi(url, filenameFromMediaUrl(url, i));
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : copy.downloadFailed);
    } finally {
      setBusy(null);
    }
  }

  function handleBack() {
    router.push(payload?.returnTo || "/motors");
  }

  return (
    <div className="flex h-full min-h-0 flex-1 flex-col bg-background">
      <header className="flex shrink-0 items-center gap-2 border-b border-border/70 px-3 py-2.5 sm:px-4">
        <Button type="button" variant="ghost" size="sm" onClick={handleBack} className="gap-1.5">
          <ArrowLeft className="size-4" />
          {copy.back}
        </Button>
        <p className="min-w-0 flex-1 truncate text-xs text-muted-foreground">
          {loading
            ? copy.viewerLoading
            : urls.length === 0
              ? copy.galleryEmpty
              : copy.galleryCount(urls.length, index + 1)}
        </p>
        <div className="flex shrink-0 items-center gap-1.5">
          <Button
            type="button"
            variant="outline"
            size="sm"
            disabled={!current || busy !== null}
            onClick={() => void handleDownloadCurrent()}
            className="gap-1.5"
          >
            {busy === "one" ? <Loader2 className="size-3.5 animate-spin" /> : <Download className="size-3.5" />}
            <span className="hidden sm:inline">{copy.download}</span>
          </Button>
          {urls.length > 1 ? (
            <Button
              type="button"
              variant="secondary"
              size="sm"
              disabled={busy !== null}
              onClick={() => void handleDownloadAll()}
              className="gap-1.5"
            >
              {busy === "all" ? <Loader2 className="size-3.5 animate-spin" /> : <Download className="size-3.5" />}
              <span className="hidden sm:inline">{copy.downloadAll}</span>
            </Button>
          ) : null}
        </div>
      </header>

      {error ? (
        <p className="shrink-0 border-b border-destructive/20 bg-destructive/5 px-4 py-2 text-xs text-destructive">
          {error}
        </p>
      ) : null}

      <div className="relative flex min-h-0 flex-1 items-center justify-center bg-zinc-950">
        {loading ? (
          <Loader2 className="size-8 animate-spin text-white/50" />
        ) : current ? (
          isVideo ? (
            <video
              key={current}
              src={current}
              controls
              playsInline
              className="max-h-full max-w-full object-contain"
            />
          ) : (
            // eslint-disable-next-line @next/next/no-img-element
            <img key={current} src={current} alt={payload?.title?.trim() || copy.galleryTitle} className="max-h-full max-w-full object-contain" />
          )
        ) : (
          <div className="flex flex-col items-center gap-2 px-6 text-center text-white/60">
            <Film className="size-8 opacity-50" />
            <p className="text-sm">{copy.galleryEmpty}</p>
          </div>
        )}

        {urls.length > 1 ? (
          <>
            <Button
              type="button"
              size="icon"
              variant="secondary"
              className="absolute top-1/2 left-3 -translate-y-1/2"
              onClick={() => go(-1)}
              aria-label={copy.prev}
            >
              <ChevronLeft className="size-4" />
            </Button>
            <Button
              type="button"
              size="icon"
              variant="secondary"
              className="absolute top-1/2 right-3 -translate-y-1/2"
              onClick={() => go(1)}
              aria-label={copy.next}
            >
              <ChevronRight className="size-4" />
            </Button>
          </>
        ) : null}
      </div>

      {urls.length > 1 ? (
        <div className="flex shrink-0 gap-2 overflow-x-auto border-t border-border/70 bg-background px-3 py-3 sm:px-4">
          {urls.map((url, thumbIndex) => (
            <button
              key={`${url}-${thumbIndex}`}
              type="button"
              className={cn(
                "relative size-16 shrink-0 overflow-hidden rounded-md border border-border/70 bg-muted",
                thumbIndex === index && "ring-2 ring-primary ring-offset-2 ring-offset-background",
              )}
              onClick={() => setIndex(thumbIndex)}
            >
              <GridMediaThumb url={url} />
            </button>
          ))}
        </div>
      ) : null}
    </div>
  );
}
