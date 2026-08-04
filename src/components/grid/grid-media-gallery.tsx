"use client";

import { ChevronLeft, ChevronRight, Film, Trash2 } from "lucide-react";
import { useEffect, useState } from "react";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { isVideoMediaUrl } from "@/lib/grid/upload-row-photo-utils";
import { userCopy } from "@/lib/user-copy";
import { cn } from "@/lib/utils";

type GridMediaGalleryProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  urls: string[];
  canEdit?: boolean;
  onChange?: (urls: string[]) => void;
  initialIndex?: number;
};

export function GridMediaGallery({
  open,
  onOpenChange,
  urls,
  canEdit,
  onChange,
  initialIndex = 0,
}: GridMediaGalleryProps) {
  const copy = userCopy.gridPhotos;
  const [index, setIndex] = useState(initialIndex);

  useEffect(() => {
    if (open) {
      setIndex(Math.min(Math.max(0, initialIndex), Math.max(0, urls.length - 1)));
    }
  }, [open, initialIndex, urls.length]);

  useEffect(() => {
    if (index >= urls.length && urls.length > 0) {
      setIndex(urls.length - 1);
    }
  }, [index, urls.length]);

  const current = urls[index] ?? null;
  const isVideo = current ? isVideoMediaUrl(current) : false;

  function go(delta: number) {
    if (urls.length === 0) return;
    setIndex((currentIndex) => (currentIndex + delta + urls.length) % urls.length);
  }

  function removeCurrent() {
    if (!canEdit || !onChange || !current) return;
    const next = urls.filter((_, i) => i !== index);
    onChange(next);
    if (next.length === 0) {
      onOpenChange(false);
      return;
    }
    setIndex((currentIndex) => Math.min(currentIndex, next.length - 1));
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className="flex max-h-[min(92vh,880px)] w-[min(96vw,920px)] max-w-none flex-col gap-3 p-3 sm:max-w-none sm:p-4"
        overlayClassName="bg-black/50 supports-backdrop-filter:backdrop-blur-sm"
      >
        <DialogHeader className="pr-8">
          <DialogTitle>{copy.galleryTitle}</DialogTitle>
          <DialogDescription>
            {urls.length === 0
              ? copy.galleryEmpty
              : copy.galleryCount(urls.length, index + 1)}
          </DialogDescription>
        </DialogHeader>

        <div className="relative flex min-h-0 flex-1 items-center justify-center overflow-hidden rounded-lg bg-black/90">
          {current ? (
            isVideo ? (
              <video
                key={current}
                src={current}
                controls
                playsInline
                className="max-h-[min(62vh,640px)] max-w-full object-contain"
              />
            ) : (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                key={current}
                src={current}
                alt=""
                className="max-h-[min(62vh,640px)] max-w-full object-contain"
              />
            )
          ) : (
            <p className="px-4 py-16 text-sm text-white/70">{copy.galleryEmpty}</p>
          )}

          {urls.length > 1 ? (
            <>
              <Button
                type="button"
                size="icon"
                variant="secondary"
                className="absolute top-1/2 left-2 -translate-y-1/2"
                onClick={() => go(-1)}
                aria-label={copy.prev}
              >
                <ChevronLeft className="size-4" />
              </Button>
              <Button
                type="button"
                size="icon"
                variant="secondary"
                className="absolute top-1/2 right-2 -translate-y-1/2"
                onClick={() => go(1)}
                aria-label={copy.next}
              >
                <ChevronRight className="size-4" />
              </Button>
            </>
          ) : null}
        </div>

        {urls.length > 0 ? (
          <div className="flex gap-2 overflow-x-auto pb-1">
            {urls.map((url, thumbIndex) => {
              const video = isVideoMediaUrl(url);
              return (
                <button
                  key={`${url}-${thumbIndex}`}
                  type="button"
                  className={cn(
                    "relative size-14 shrink-0 overflow-hidden rounded-md border border-border/70 bg-muted",
                    thumbIndex === index && "ring-2 ring-primary",
                  )}
                  onClick={() => setIndex(thumbIndex)}
                >
                  {video ? (
                    <span className="flex size-full items-center justify-center bg-zinc-900 text-white">
                      <Film className="size-4" />
                    </span>
                  ) : (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={url} alt="" className="size-full object-cover" />
                  )}
                </button>
              );
            })}
          </div>
        ) : null}

        {canEdit && current ? (
          <div className="flex justify-end">
            <Button type="button" variant="destructive" size="sm" onClick={removeCurrent}>
              <Trash2 className="size-3.5" />
              {copy.remove}
            </Button>
          </div>
        ) : null}
      </DialogContent>
    </Dialog>
  );
}

export function GridMediaThumb({
  url,
  className,
}: {
  url: string;
  className?: string;
}) {
  if (isVideoMediaUrl(url)) {
    return (
      <span className={cn("relative flex size-full items-center justify-center bg-zinc-900 text-white", className)}>
        <video src={url} muted playsInline preload="metadata" className="absolute inset-0 size-full object-cover opacity-70" />
        <Film className="relative size-3.5 drop-shadow" />
      </span>
    );
  }
  // eslint-disable-next-line @next/next/no-img-element
  return <img src={url} alt="" className={cn("size-full object-cover", className)} />;
}
