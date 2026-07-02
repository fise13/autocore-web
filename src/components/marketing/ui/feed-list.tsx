"use client";

import type { SimulatedFeedEvent } from "@/components/marketing/lib/simulated-feed";
import { cn } from "@/lib/utils";

const toneDot: Record<SimulatedFeedEvent["tone"], string> = {
  success: "bg-emerald-500",
  warning: "bg-amber-500",
  operational: "bg-primary",
  critical: "bg-destructive",
};

type FeedListProps = {
  events: SimulatedFeedEvent[];
  compact?: boolean;
  minimal?: boolean;
};

export function FeedList({ events, compact, minimal }: FeedListProps) {
  return (
    <ul className={cn(minimal ? "divide-y divide-border" : "flex flex-col gap-2")}>
      {events.map((event) => (
        <li
          key={event.id}
          className={cn(
            "flex items-start gap-3",
            minimal ? "py-2.5 first:pt-0" : "rounded-lg border border-border bg-background px-3 py-2.5",
            compact && !minimal && "py-2",
          )}
        >
          <span className={cn("mt-1.5 size-2 shrink-0 rounded-full", toneDot[event.tone])} />
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-medium">{event.action}</p>
            <p className="mt-0.5 text-xs text-muted-foreground">
              {event.actor} · {event.module}
            </p>
          </div>
          <span className="shrink-0 text-[10px] tabular-nums text-muted-foreground">{event.time}</span>
        </li>
      ))}
    </ul>
  );
}
