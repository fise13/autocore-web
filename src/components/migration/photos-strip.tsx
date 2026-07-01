"use client";

import { Images } from "lucide-react";

import { cn } from "@/lib/utils";
import type { ImageAsset } from "@/lib/import";

import { PHOTO_DRAG_TYPE } from "./photo-drag";
import { PhotoThumb } from "./photo-thumb";

/** Unmatched photos the user can drag onto a row to attach instantly. */
export function PhotosStrip({
  images,
  attachedPaths,
}: {
  images: ImageAsset[];
  attachedPaths: Set<string>;
}) {
  const unmatched = images.filter((image) => !attachedPaths.has(image.path));
  if (unmatched.length === 0) return null;

  return (
    <div className="flex items-center gap-3 rounded-xl border bg-card p-3">
      <span className="flex shrink-0 items-center gap-1.5 text-xs font-medium text-muted-foreground">
        <Images className="size-4" />
        {unmatched.length} фото без привязки
      </span>
      <div className="flex min-w-0 flex-1 gap-2 overflow-x-auto pb-1">
        {unmatched.map((image) => (
          <button
            key={image.path}
            type="button"
            draggable
            onDragStart={(event) => {
              event.dataTransfer.setData(PHOTO_DRAG_TYPE, image.path);
              event.dataTransfer.effectAllowed = "copy";
            }}
            title={image.fileName}
            className={cn(
              "group relative shrink-0 cursor-grab overflow-hidden rounded-md ring-1 ring-border transition-transform active:cursor-grabbing active:scale-95",
            )}
          >
            <PhotoThumb asset={image} className="size-12" />
          </button>
        ))}
      </div>
      <span className="hidden shrink-0 text-xs text-muted-foreground sm:block">
        Перетащите на строку
      </span>
    </div>
  );
}
