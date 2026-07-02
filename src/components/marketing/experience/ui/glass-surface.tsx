"use client";

import type { ReactNode } from "react";

import { usePerformanceTier } from "@/components/providers/performance-tier-provider";
import { cn } from "@/lib/utils";

type GlassSurfaceProps = {
  children: ReactNode;
  className?: string;
  blur?: boolean;
};

export function GlassSurface({ children, className, blur = true }: GlassSurfaceProps) {
  const { backdropBlur } = usePerformanceTier();

  return (
    <div
      className={cn(
        "exp-glass",
        blur && backdropBlur && "exp-glass-blur",
        className,
      )}
    >
      {children}
    </div>
  );
}
