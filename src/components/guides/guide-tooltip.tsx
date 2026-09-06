"use client";

import { useEffect, useRef, useState } from "react";

import { cn } from "@/lib/utils";

type GuideTooltipProps = {
  rect: DOMRect | null;
  title: string;
  instruction: string;
  dockOnTop: boolean;
  moveKey: string;
};

const MOVE_MS = 320;
const EASE = "cubic-bezier(0.22, 1, 0.36, 1)";
const TOOLTIP_WIDTH = 288;

export function GuideTooltip({
  rect,
  title,
  instruction,
  dockOnTop,
  moveKey,
}: GuideTooltipProps) {
  const [shown, setShown] = useState<DOMRect | null>(rect);
  const [animate, setAnimate] = useState(false);
  const prevKey = useRef(moveKey);
  const hadHole = useRef(Boolean(rect));

  useEffect(() => {
    if (!rect) return;
    const keyChanged = prevKey.current !== moveKey;
    prevKey.current = moveKey;
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (keyChanged && hadHole.current && !reduced) {
      setAnimate(true);
      const id = window.setTimeout(() => setAnimate(false), MOVE_MS);
      setShown(rect);
      hadHole.current = true;
      return () => window.clearTimeout(id);
    }
    hadHole.current = true;
    setShown(rect);
  }, [moveKey, rect]);

  if (!shown) return null;

  const width = Math.min(TOOLTIP_WIDTH, typeof window === "undefined" ? TOOLTIP_WIDTH : window.innerWidth - 32);
  const gap = 12;
  const viewportW = typeof window === "undefined" ? 1200 : window.innerWidth;
  const viewportH = typeof window === "undefined" ? 800 : window.innerHeight;
  const dockReserve = dockOnTop ? 0 : 120;
  const preferRight = shown.right + gap + width < viewportW - 16;
  const preferLeft = shown.left - gap - width > 16;
  const preferBelow = !preferRight && !preferLeft && shown.bottom + 88 < viewportH - dockReserve;

  let top = shown.top;
  let left = shown.left;
  if (preferRight) {
    left = shown.right + gap;
    top = shown.top;
  } else if (preferLeft) {
    left = shown.left - gap - width;
    top = shown.top;
  } else if (preferBelow) {
    top = shown.bottom + gap;
    left = Math.min(Math.max(16, shown.left), viewportW - width - 16);
  } else {
    top = Math.max(12, shown.top - gap);
    left = Math.min(Math.max(16, shown.left), viewportW - width - 16);
  }

  return (
    <div
      className={cn(
        "pointer-events-none fixed z-[65] rounded-xl border border-border bg-popover px-3 py-2.5 text-popover-foreground shadow-sm",
        !preferRight && !preferLeft && !preferBelow && "-translate-y-full",
      )}
      style={{
        top,
        left,
        width,
        transition: animate
          ? `top ${MOVE_MS}ms ${EASE}, left ${MOVE_MS}ms ${EASE}`
          : "none",
      }}
      role="note"
    >
      <p className="text-xs font-medium text-foreground">{title}</p>
      <p className="mt-0.5 text-xs leading-relaxed text-muted-foreground">{instruction}</p>
    </div>
  );
}
