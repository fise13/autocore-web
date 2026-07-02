"use client";

import { cn } from "@/lib/utils";

type LiveBadgeProps = {
  label?: string;
  className?: string;
};

export function LiveBadge({ label = "Live", className }: LiveBadgeProps) {
  return (
    <span className={cn("exp-live-badge", className)}>
      <span className="exp-live-dot" aria-hidden />
      {label}
    </span>
  );
}
