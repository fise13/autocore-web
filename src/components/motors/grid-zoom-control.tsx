"use client";

import { Search } from "lucide-react";

import { useWorkspace } from "@/components/layout/workspace-context";

const MIN_ZOOM = 0.75;
const MAX_ZOOM = 1.6;

export function GridZoomControl() {
  const { gridZoom, setGridZoom } = useWorkspace();

  return (
    <div className="pointer-events-none absolute inset-0">
      <div className="pointer-events-auto absolute right-3 bottom-3 flex items-center gap-2 rounded-[10px] border border-border/40 bg-card/95 px-2.5 py-1.5 shadow-sm backdrop-blur-sm">
        <Search className="size-3.5 text-muted-foreground" strokeWidth={2.25} />
        <input
          type="range"
          min={MIN_ZOOM}
          max={MAX_ZOOM}
          step={0.01}
          value={gridZoom}
          onChange={(event) => {
            const value = Number(event.target.value);
            setGridZoom(Math.min(MAX_ZOOM, Math.max(MIN_ZOOM, value)));
          }}
          className="h-1 w-[110px] accent-emerald-600 transition-opacity duration-200"
          aria-label="Масштаб таблицы"
        />
      </div>
    </div>
  );
}
