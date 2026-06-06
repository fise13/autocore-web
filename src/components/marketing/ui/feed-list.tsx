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
};

export function FeedList({ events, compact }: FeedListProps) {
  return (
    <ul className="space-y-2">
      {events.map((event) => (
        <li
          key={event.id}
          className={cn(
            "flex items-start gap-3 rounded-lg border border-border/80 bg-background px-3 py-2.5",
            compact && "py-2",
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
