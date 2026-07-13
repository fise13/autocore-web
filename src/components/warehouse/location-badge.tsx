"use client";

import { MapPin } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

type LocationBadgeProps = {
  label?: string | null;
  emptyLabel?: string;
  className?: string;
  mutedWhenEmpty?: boolean;
};

export function LocationBadge({
  label,
  emptyLabel = "Без места",
  className,
  mutedWhenEmpty = true,
}: LocationBadgeProps) {
  const value = label?.trim();
  const empty = !value;

  return (
    <Badge
      variant={empty ? "outline" : "secondary"}
      className={cn(
        "max-w-full gap-1 font-medium tabular-nums",
        empty && mutedWhenEmpty && "text-muted-foreground",
        className,
      )}
    >
      <MapPin className="size-3 opacity-70" />
      <span className="truncate">{empty ? emptyLabel : value}</span>
    </Badge>
  );
}
