"use client";

import { Shimmer } from "@/components/ai-elements/shimmer";
import { cn } from "@/lib/utils";

export function CoreStatus({
  label,
  live = true,
  className,
}: {
  label: string;
  live?: boolean;
  className?: string;
}) {
  return (
    <p className={cn("core-status", className)} role="status" aria-live="polite">
      <span className={cn("core-status__mark", live && "is-live")} aria-hidden />
      {live ? <Shimmer as="span" duration={1.6}>{label}</Shimmer> : <span>{label}</span>}
    </p>
  );
}
