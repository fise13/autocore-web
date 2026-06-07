"use client";

import { animate, createScope, stagger } from "animejs";
import { createDrawable } from "animejs/svg";
import { useEffect, useRef } from "react";

import {
  AUTOCORE_LOGO_BRAND_RED,
  AUTOCORE_LOGO_INNER_PATH,
  AUTOCORE_LOGO_OUTER_PATH,
} from "@/components/brand/autocore-logo-mark-paths";
import { cn } from "@/lib/utils";

type AppLoadingLogoDrawableProps = {
  size?: number;
  className?: string;
};

export function AppLoadingLogoDrawable({ size = 80, className }: AppLoadingLogoDrawableProps) {
  const rootRef = useRef<SVGSVGElement>(null);

  useEffect(() => {
    const root = rootRef.current;
    if (!root) return;

    const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (reduceMotion) return;

    const scope = createScope({ root });

    scope.add(() => {
      const drawables = createDrawable(root.querySelectorAll(".autocore-logo-draw"));
      animate(drawables, {
        draw: ["0 0", "0 1", "1 1"],
        ease: "inOutQuad",
        duration: 1400,
        delay: stagger(90),
        loop: true,
      });
    });

    return () => {
      scope.revert();
    };
  }, []);

  return (
    <svg
      ref={rootRef}
      viewBox="0 0 100 100"
      width={size}
      height={size}
      role="img"
      aria-hidden
      className={cn("shrink-0 text-[#E82626]", className)}
    >
      <path
        className="autocore-logo-draw"
        d={AUTOCORE_LOGO_OUTER_PATH}
        fill="none"
        stroke="currentColor"
        strokeWidth={4.25}
        strokeLinecap="round"
        strokeLinejoin="round"
        vectorEffect="non-scaling-stroke"
      />
      <path
        className="autocore-logo-draw"
        d={AUTOCORE_LOGO_INNER_PATH}
        fill="none"
        stroke="currentColor"
        strokeWidth={3.25}
        strokeLinecap="round"
        strokeLinejoin="round"
        vectorEffect="non-scaling-stroke"
      />
      <title>AutoCore</title>
    </svg>
  );
}

/** Static filled mark for reduced-motion / SSR fallback. */
export function AppLoadingLogoStatic({ size = 80, className }: AppLoadingLogoDrawableProps) {
  return (
    <svg
      viewBox="0 0 100 100"
      width={size}
      height={size}
      role="img"
      aria-hidden
      className={cn("shrink-0", className)}
    >
      <path d={`${AUTOCORE_LOGO_OUTER_PATH} Z`} fill={AUTOCORE_LOGO_BRAND_RED} />
      <path d={`${AUTOCORE_LOGO_INNER_PATH} Z`} fill="var(--background)" />
    </svg>
  );
}
