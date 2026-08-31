"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";

import { cn } from "@/lib/utils";

/** Virtual width the product chrome is laid out at while scaled. */
const DESKTOP_WIDTH = 1080;

/** Below this container width the desktop composition can no longer breathe. */
const SCALE_BELOW = 900;

const MIN_SCALE = 0.22;

type ScaledDesktopStageProps = {
  children: ReactNode;
  className?: string;
  width?: number;
};

/**
 * Shows desktop product UI on a phone as a shrunken window instead of a
 * squeezed one. Reflowing a four-column dashboard into 390px produced crushed
 * labels and nested horizontal scroll; laying it out at `width` and scaling the
 * whole thing down keeps the composition readable as a composition.
 *
 * Above `SCALE_BELOW` the wrapper is a pass-through — no transform, no measured
 * height, nothing for the desktop layout to fight.
 */
export function ScaledDesktopStage({
  children,
  className,
  width = DESKTOP_WIDTH,
}: ScaledDesktopStageProps) {
  const outerRef = useRef<HTMLDivElement>(null);
  const innerRef = useRef<HTMLDivElement>(null);
  const [scale, setScale] = useState(1);
  const [innerHeight, setInnerHeight] = useState(0);

  useEffect(() => {
    const outer = outerRef.current;
    const inner = innerRef.current;
    if (!outer || !inner) return;

    const measure = () => {
      const available = outer.clientWidth;
      if (available <= 0) return;
      setScale(available >= SCALE_BELOW ? 1 : Math.max(MIN_SCALE, available / width));
      setInnerHeight(inner.offsetHeight);
    };

    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(outer);
    observer.observe(inner);
    return () => observer.disconnect();
  }, [width]);

  const scaled = scale < 1;

  return (
    <div
      ref={outerRef}
      className={cn("exp-scaled-stage", className)}
      data-scaled={scaled ? "true" : undefined}
      style={scaled && innerHeight > 0 ? { height: Math.round(innerHeight * scale) } : undefined}
    >
      <div
        ref={innerRef}
        className="exp-scaled-stage-inner"
        style={
          scaled
            ? { width, transform: `scale(${scale})`, transformOrigin: "top left" }
            : undefined
        }
      >
        {children}
      </div>
    </div>
  );
}
