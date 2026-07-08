"use client";

import { useCallback, useMemo, useState } from "react";
import {
  Maximize2,
  Minimize2,
  RotateCcw,
  RotateCw,
  ZoomIn,
  ZoomOut,
} from "lucide-react";
import { TransformComponent, TransformWrapper, type ReactZoomPanPinchRef } from "react-zoom-pan-pinch";
import { motion } from "framer-motion";

import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";

type DocumentImportViewerProps = {
  imageUrl: string | null;
  alt?: string;
  loading?: boolean;
  className?: string;
};

export function DocumentImportViewer({
  imageUrl,
  alt = "Imported document",
  loading = false,
  className,
}: DocumentImportViewerProps) {
  const [rotation, setRotation] = useState(0);
  const [fullscreen, setFullscreen] = useState(false);
  const [imageLoaded, setImageLoaded] = useState(false);
  const apiRef = useMemo(() => ({ current: null as ReactZoomPanPinchRef | null }), []);

  const resetView = useCallback(() => {
    apiRef.current?.resetTransform();
    setRotation(0);
  }, [apiRef]);

  const fitWidth = useCallback(() => {
    apiRef.current?.centerView(1, 200);
  }, [apiRef]);

  const fitPage = useCallback(() => {
    apiRef.current?.resetTransform(200);
  }, [apiRef]);

  if (loading) {
    return (
      <div className={cn("flex h-full min-h-[420px] items-center justify-center rounded-2xl border bg-muted/30", className)}>
        <Skeleton className="h-[70%] w-[55%] rounded-xl" />
      </div>
    );
  }

  if (!imageUrl) {
    return (
      <div className={cn("flex h-full min-h-[420px] flex-col items-center justify-center gap-2 rounded-2xl border bg-muted/20", className)}>
        <p className="text-sm font-medium text-foreground">Нет изображения</p>
        <p className="text-xs text-muted-foreground">Документ ещё загружается или повреждён</p>
      </div>
    );
  }

  return (
    <motion.div
      layout
      initial={{ opacity: 0, scale: 0.98 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.28, ease: [0.22, 1, 0.36, 1] }}
      className={cn(
        "relative flex h-full min-h-[420px] flex-col overflow-hidden rounded-2xl border bg-[#0b0b0c]",
        fullscreen && "fixed inset-4 z-50 min-h-0 shadow-2xl",
        className,
      )}
    >
      <div className="flex items-center gap-1 border-b border-white/10 px-3 py-2">
        <Button type="button" size="icon-sm" variant="ghost" className="text-white/80 hover:bg-white/10 hover:text-white" onClick={() => apiRef.current?.zoomIn(0.25)}>
          <ZoomIn className="size-4" />
        </Button>
        <Button type="button" size="icon-sm" variant="ghost" className="text-white/80 hover:bg-white/10 hover:text-white" onClick={() => apiRef.current?.zoomOut(0.25)}>
          <ZoomOut className="size-4" />
        </Button>
        <Button type="button" size="icon-sm" variant="ghost" className="text-white/80 hover:bg-white/10 hover:text-white" onClick={() => setRotation((value) => value - 90)}>
          <RotateCcw className="size-4" />
        </Button>
        <Button type="button" size="icon-sm" variant="ghost" className="text-white/80 hover:bg-white/10 hover:text-white" onClick={() => setRotation((value) => value + 90)}>
          <RotateCw className="size-4" />
        </Button>
        <Button type="button" size="sm" variant="ghost" className="text-xs text-white/80 hover:bg-white/10 hover:text-white" onClick={fitWidth}>
          Fit width
        </Button>
        <Button type="button" size="sm" variant="ghost" className="text-xs text-white/80 hover:bg-white/10 hover:text-white" onClick={fitPage}>
          Fit page
        </Button>
        <Button type="button" size="sm" variant="ghost" className="text-xs text-white/80 hover:bg-white/10 hover:text-white" onClick={resetView}>
          Reset
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

      <div className="relative min-h-0 flex-1">
        {!imageLoaded ? (
          <div className="absolute inset-0 z-10 flex items-center justify-center">
            <Skeleton className="h-[60%] w-[50%] rounded-xl bg-white/10" />
          </div>
        ) : null}
        <TransformWrapper
          initialScale={1}
          minScale={0.4}
          maxScale={5}
          centerOnInit
          onInit={(ref) => {
            apiRef.current = ref;
          }}
        >
          <TransformComponent wrapperClass="!h-full !w-full" contentClass="!h-full !w-full flex items-center justify-center">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={imageUrl}
              alt={alt}
              onLoad={() => setImageLoaded(true)}
              className="max-h-full max-w-full select-none object-contain transition-transform duration-300 ease-out"
              style={{ transform: `rotate(${rotation}deg)` }}
              draggable={false}
            />
          </TransformComponent>
        </TransformWrapper>
      </div>
    </motion.div>
  );
}
