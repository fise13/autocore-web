"use client";

import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type CSSProperties,
  type PointerEvent as ReactPointerEvent,
  type ReactNode,
} from "react";

import { cn } from "@/lib/utils";

const STORAGE_KEY = "autocore.document-import.split";
const DEFAULT_RIGHT_PCT = 34;
const MIN_LEFT_PX = 280;
const MIN_RIGHT_PX = 280;

type HorizontalResizableSplitProps = {
  left: ReactNode;
  right: ReactNode;
  className?: string;
};

function readStoredRightPct(): number {
  if (typeof window === "undefined") return DEFAULT_RIGHT_PCT;
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    const value = raw ? Number(raw) : NaN;
    if (Number.isFinite(value) && value >= 22 && value <= 62) return value;
  } catch {
    // ignore
  }
  return DEFAULT_RIGHT_PCT;
}

/**
 * Drag handle between left (viewer) and right (data) panes. Width persists in localStorage.
 */
export function HorizontalResizableSplit({ left, right, className }: HorizontalResizableSplitProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [rightPct, setRightPct] = useState(DEFAULT_RIGHT_PCT);
  const [dragging, setDragging] = useState(false);
  const rightPctRef = useRef(rightPct);
  rightPctRef.current = rightPct;

  useEffect(() => {
    setRightPct(readStoredRightPct());
  }, []);

  const clampPct = useCallback((next: number, width: number) => {
    const minRight = (MIN_RIGHT_PX / width) * 100;
    const maxRight = 100 - (MIN_LEFT_PX / width) * 100;
    return Math.min(Math.max(next, minRight), maxRight);
  }, []);

  const persist = useCallback((value: number) => {
    try {
      window.localStorage.setItem(STORAGE_KEY, String(Math.round(value * 10) / 10));
    } catch {
      // ignore
    }
  }, []);

  const onPointerDown = useCallback((event: ReactPointerEvent<HTMLDivElement>) => {
    event.preventDefault();
    event.currentTarget.setPointerCapture(event.pointerId);
    setDragging(true);
  }, []);

  const onPointerMove = useCallback(
    (event: ReactPointerEvent<HTMLDivElement>) => {
      if (!dragging || !containerRef.current) return;
      const rect = containerRef.current.getBoundingClientRect();
      if (rect.width <= 0) return;
      const fromRight = ((rect.right - event.clientX) / rect.width) * 100;
      setRightPct(clampPct(fromRight, rect.width));
    },
    [clampPct, dragging],
  );

  const endDrag = useCallback(
    (event: ReactPointerEvent<HTMLDivElement>) => {
      if (!dragging) return;
      setDragging(false);
      try {
        event.currentTarget.releasePointerCapture(event.pointerId);
      } catch {
        // ignore
      }
      persist(rightPctRef.current);
    },
    [dragging, persist],
  );

  const vars = {
    "--doc-import-right": `${rightPct}%`,
    "--doc-import-left": `${100 - rightPct}%`,
  } as CSSProperties;

  return (
    <div
      ref={containerRef}
      style={vars}
      className={cn(
        "flex min-h-0 flex-1 flex-col gap-3 lg:flex-row lg:gap-0",
        dragging && "select-none",
        className,
      )}
    >
      <div className="min-h-[40vh] min-w-0 flex-1 lg:min-h-0 lg:w-[var(--doc-import-left)] lg:flex-none">
        {left}
      </div>

      <div
        role="separator"
        aria-orientation="vertical"
        aria-label="Изменить ширину панелей"
        aria-valuenow={Math.round(rightPct)}
        tabIndex={0}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={endDrag}
        onPointerCancel={endDrag}
        onKeyDown={(event) => {
          if (!containerRef.current) return;
          const width = containerRef.current.getBoundingClientRect().width;
          if (event.key === "ArrowLeft") {
            event.preventDefault();
            setRightPct((current) => {
              const next = clampPct(current + 2, width);
              persist(next);
              return next;
            });
          }
          if (event.key === "ArrowRight") {
            event.preventDefault();
            setRightPct((current) => {
              const next = clampPct(current - 2, width);
              persist(next);
              return next;
            });
          }
        }}
        className={cn(
          "relative hidden w-3 shrink-0 touch-none cursor-col-resize lg:flex",
          "group items-stretch justify-center",
        )}
      >
        <div
          className={cn(
            "absolute inset-y-3 left-1/2 w-px -translate-x-1/2 bg-border transition-colors",
            "group-hover:bg-primary/50 group-focus-visible:bg-primary",
            dragging && "bg-primary",
          )}
        />
        <div
          className={cn(
            "absolute top-1/2 left-1/2 h-10 w-1 -translate-x-1/2 -translate-y-1/2 rounded-full",
            "bg-muted-foreground/35 transition-colors",
            "group-hover:bg-primary/70 group-focus-visible:bg-primary",
            dragging && "bg-primary",
          )}
        />
      </div>

      <div className="min-h-[36vh] min-w-0 flex-1 lg:min-h-0 lg:w-[var(--doc-import-right)] lg:flex-none">
        {right}
      </div>
    </div>
  );
}
