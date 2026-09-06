"use client";

import { useEffect, useRef, useState } from "react";

import { cn } from "@/lib/utils";

type GuideSpotlightProps = {
  rect: DOMRect | null;
  showMe: boolean;
  moveKey: string;
};

const MOVE_MS = 320;
const EASE = "cubic-bezier(0.22, 1, 0.36, 1)";

export function GuideSpotlight({ rect, showMe, moveKey }: GuideSpotlightProps) {
  const [tick, setTick] = useState(0);
  const [shown, setShown] = useState<DOMRect | null>(rect);
  const [animate, setAnimate] = useState(false);
  const prevKey = useRef(moveKey);
  const hadHole = useRef(Boolean(rect));

  useEffect(() => {
    if (!showMe) return;
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (reduced) return;
    const id = window.setInterval(() => setTick((value) => value + 1), 700);
    return () => window.clearInterval(id);
  }, [showMe]);

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

  const pad = 6;
  const top = Math.max(8, shown.top - pad);
  const left = Math.max(8, shown.left - pad);
  const width = shown.width + pad * 2;
  const height = shown.height + pad * 2;
  const move = animate
    ? `top ${MOVE_MS}ms ${EASE}, left ${MOVE_MS}ms ${EASE}, width ${MOVE_MS}ms ${EASE}, height ${MOVE_MS}ms ${EASE}`
    : "none";
  const hole = animate ? `clip-path ${MOVE_MS}ms ${EASE}` : "none";

  return (
    <div className="pointer-events-none fixed inset-0 z-40" aria-hidden>
      <div
        className="fixed inset-0 bg-black/25 backdrop-blur-[2px] dark:bg-black/65 dark:backdrop-blur-[8px]"
        style={{
          transition: hole,
          clipPath: `polygon(0 0, 100% 0, 100% 100%, 0 100%, 0 0, ${left}px ${top}px, ${left}px ${top + height}px, ${left + width}px ${top + height}px, ${left + width}px ${top}px, ${left}px ${top}px)`,
        }}
      />
      <div
        className={cn(
          "fixed z-[70] rounded-lg ring-2 ring-ring ring-offset-2 ring-offset-background",
          showMe && tick % 2 === 0 && "ring-4",
        )}
        style={{ top, left, width, height, transition: move }}
      />
    </div>
  );
}
