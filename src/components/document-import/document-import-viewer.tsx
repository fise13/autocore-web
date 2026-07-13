"use client";

import { useEffect, useState } from "react";
import {
  Maximize2,
  Minimize2,
  RotateCcw,
  RotateCw,
  ZoomIn,
  ZoomOut,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";

type DocumentImportViewerProps = {
  imageUrl: string | null;
  alt?: string;
  loading?: boolean;
  className?: string;
};

const ZOOM_STEP = 0.2;
const MIN_ZOOM = 0.5;
const MAX_ZOOM = 3;

export function DocumentImportViewer({
  imageUrl,
  alt = "Imported document",
  loading = false,
  className,
}: DocumentImportViewerProps) {
  const [rotation, setRotation] = useState(0);
  const [zoom, setZoom] = useState(1);
  const [fullscreen, setFullscreen] = useState(false);
  const [imageLoaded, setImageLoaded] = useState(false);
  const [imageError, setImageError] = useState(false);

  useEffect(() => {
    setImageLoaded(false);
    setImageError(false);
    setRotation(0);
    setZoom(1);
  }, [imageUrl]);

  if (loading) {
    return (
      <div className={cn("flex h-full min-h-0 items-center justify-center rounded-2xl border bg-muted/30", className)}>
        <Skeleton className="h-[70%] w-[55%] rounded-xl" />
      </div>
    );
  }

  if (!imageUrl || imageError) {
    return (
      <div className={cn("flex h-full min-h-0 flex-col items-center justify-center gap-2 rounded-2xl border bg-muted/20", className)}>
        <p className="text-sm font-medium text-foreground">
          {imageError ? "Не удалось загрузить изображение" : "Нет изображения"}
        </p>
        <p className="text-xs text-muted-foreground">
          {imageError
            ? "Ссылка на файл недоступна — попробуйте открыть импорт заново с телефона"
            : "Документ ещё загружается или повреждён"}
        </p>
      </div>
    );
  }

  return (
    <div
      className={cn(
        "relative flex h-full min-h-0 flex-col overflow-hidden rounded-2xl border bg-[#0b0b0c]",
        fullscreen && "fixed inset-4 z-50 shadow-2xl",
        className,
      )}
    >
      <div className="flex shrink-0 items-center gap-1 border-b border-white/10 px-3 py-2">
        <Button
          type="button"
          size="icon-sm"
          variant="ghost"
          className="text-white/80 hover:bg-white/10 hover:text-white"
          onClick={() => setZoom((value) => Math.min(value + ZOOM_STEP, MAX_ZOOM))}
        >
          <ZoomIn className="size-4" />
        </Button>
        <Button
          type="button"
          size="icon-sm"
          variant="ghost"
          className="text-white/80 hover:bg-white/10 hover:text-white"
          onClick={() => setZoom((value) => Math.max(value - ZOOM_STEP, MIN_ZOOM))}
        >
          <ZoomOut className="size-4" />
        </Button>
        <Button
          type="button"
          size="icon-sm"
          variant="ghost"
          className="text-white/80 hover:bg-white/10 hover:text-white"
          onClick={() => setRotation((value) => value - 90)}
        >
          <RotateCcw className="size-4" />
        </Button>
        <Button
          type="button"
          size="icon-sm"
          variant="ghost"
          className="text-white/80 hover:bg-white/10 hover:text-white"
          onClick={() => setRotation((value) => value + 90)}
        >
          <RotateCw className="size-4" />
        </Button>
        <Button
          type="button"
          size="sm"
          variant="ghost"
          className="text-xs text-white/80 hover:bg-white/10 hover:text-white"
          onClick={() => {
            setZoom(1);
            setRotation(0);
          }}
        >
          Вписать
        </Button>
        <div className="flex-1" />
        <Button
          type="button"
          size="icon-sm"
          variant="ghost"
          className="text-white/80 hover:bg-white/10 hover:text-white"
          onClick={() => setFullscreen((value) => !value)}
        >
          {fullscreen ? <Minimize2 className="size-4" /> : <Maximize2 className="size-4" />}
        </Button>
      </div>

      <div className="relative min-h-0 flex-1 overflow-hidden">
        {!imageLoaded ? (
          <div className="absolute inset-0 z-10 flex items-center justify-center">
            <Skeleton className="h-[60%] w-[50%] rounded-xl bg-white/10" />
          </div>
        ) : null}
        <div className="flex h-full w-full items-center justify-center p-3 sm:p-4">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={imageUrl}
            alt={alt}
            onLoad={() => setImageLoaded(true)}
            onError={() => {
              setImageError(true);
              setImageLoaded(false);
            }}
            className={cn(
              "block h-full w-full select-none object-contain transition-opacity duration-200",
              !imageLoaded && "opacity-0",
            )}
            style={{
              transform: `rotate(${rotation}deg) scale(${zoom})`,
              transformOrigin: "center center",
            }}
            draggable={false}
          />
        </div>
      </div>
    </div>
  );
}
