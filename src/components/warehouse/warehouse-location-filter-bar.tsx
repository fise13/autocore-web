"use client";

import type { ReactNode } from "react";

import { Button } from "@/components/ui/button";
import {
  countUnlocatedItems,
  type WarehouseLocationFilter,
  collectLocationFilterOptions,
} from "@/lib/warehouse/warehouse-location-filter";
import { cn } from "@/lib/utils";
import type { InventoryItem } from "@/domain/inventory";
import { userCopy } from "@/lib/user-copy";

type WarehouseLocationFilterBarProps = {
  items: InventoryItem[];
  filter: WarehouseLocationFilter;
  onChange: (filter: WarehouseLocationFilter) => void;
  className?: string;
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
        "h-7 shrink-0 rounded-md px-2 text-xs font-medium",
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
  className,
}: WarehouseLocationFilterBarProps) {
  const unlocated = countUnlocatedItems(items);
  const options = collectLocationFilterOptions(items);

  if (items.length === 0) return null;

  return (
    <div
      className={cn(
        "flex min-w-0 items-center gap-2 overflow-x-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden",
        className,
      )}
    >
      <Chip active={filter.kind === "all"} onClick={() => onChange({ kind: "all" })}>
        {userCopy.warehouse.allLocations}
      </Chip>
      <Chip
        active={filter.kind === "unlocated"}
        onClick={() => onChange({ kind: "unlocated" })}
      >
        {userCopy.warehouse.noLocationFilter}{unlocated > 0 ? ` · ${unlocated}` : ""}
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
