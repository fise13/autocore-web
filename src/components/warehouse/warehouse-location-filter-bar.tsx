"use client";

import type { ReactNode } from "react";
import { MapPin } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  countUnlocatedItems,
  type WarehouseLocationFilter,
  collectLocationFilterOptions,
} from "@/lib/warehouse/warehouse-location-filter";
import { cn } from "@/lib/utils";
import type { InventoryItem } from "@/domain/inventory";

type WarehouseLocationFilterBarProps = {
  items: InventoryItem[];
  filter: WarehouseLocationFilter;
  onChange: (filter: WarehouseLocationFilter) => void;
};

function Chip({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: ReactNode;
}) {
  return (
    <Button
      type="button"
      size="sm"
      variant={active ? "default" : "outline"}
      className={cn(
        "h-7 shrink-0 rounded-full px-2.5 text-xs font-medium",
        !active && "bg-background/80",
      )}
      onClick={onClick}
    >
      {children}
    </Button>
  );
}

export function WarehouseLocationFilterBar({
  items,
  filter,
  onChange,
}: WarehouseLocationFilterBarProps) {
  const unlocated = countUnlocatedItems(items);
  const options = collectLocationFilterOptions(items);

  if (items.length === 0) return null;

  return (
    <div className="flex items-center gap-2 overflow-x-auto border-b border-border/50 px-3 py-2">
      <span className="flex shrink-0 items-center gap-1 text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
        <MapPin className="size-3" />
        Место
      </span>
      <Chip active={filter.kind === "all"} onClick={() => onChange({ kind: "all" })}>
        Все
      </Chip>
      <Chip
        active={filter.kind === "unlocated"}
        onClick={() => onChange({ kind: "unlocated" })}
      >
        Без места{unlocated > 0 ? ` · ${unlocated}` : ""}
      </Chip>
      {options.map((option) => (
        <Chip
          key={option.code}
          active={filter.kind === "code" && filter.code === option.code}
          onClick={() => onChange({ kind: "code", code: option.code })}
        >
          <span className="tabular-nums">{option.code}</span>
          <span className="opacity-60"> · {option.count}</span>
        </Chip>
      ))}
    </div>
  );
}
