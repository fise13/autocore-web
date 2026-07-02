"use client";

import type { ReactNode } from "react";

import { LiveBadge } from "@/components/marketing/experience/ui/live-badge";
import { cn } from "@/lib/utils";

type ProductWindowProps = {
  title: string;
  children: ReactNode;
  className?: string;
  contentClassName?: string;
  live?: boolean;
};

export function ProductWindow({
  title,
  children,
  className,
  contentClassName,
  live,
}: ProductWindowProps) {
  return (
    <div className={cn("exp-product-window", className)}>
      <div className="exp-product-window-chrome">
        <div className="exp-traffic-lights" aria-hidden>
          <span className="bg-red-400" />
          <span className="bg-amber-400" />
          <span className="bg-emerald-500" />
        </div>
        <span className="mx-auto truncate text-[10px] text-muted-foreground sm:text-xs">{title}</span>
        {live ? <LiveBadge /> : <span className="w-12" aria-hidden />}
      </div>
      <div className={cn("p-3 sm:p-4", contentClassName)}>{children}</div>
    </div>
  );
}
