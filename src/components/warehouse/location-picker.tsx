"use client";

import { MapPin } from "lucide-react";

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { WarehouseLocation } from "@/domain/warehouse-location";
import type { LocationOccupancy } from "@/hooks/use-warehouse-location-occupancy-realtime";
import { cn } from "@/lib/utils";

type LocationPickerProps = {
  locations: WarehouseLocation[];
  valueId: string | null;
  onChange: (location: WarehouseLocation | null) => void;
  placeholder?: string;
  disabled?: boolean;
  allowClear?: boolean;
  className?: string;
  occupancyByLocationId?: Record<string, LocationOccupancy>;
  /** Empty locations first; warn when selecting occupied. */
  preferEmpty?: boolean;
};

function occupancyLabel(
  locationId: string,
  occupancyByLocationId?: Record<string, LocationOccupancy>,
): string {
  const occ = occupancyByLocationId?.[locationId];
  if (!occ || occ.lineCount === 0) return "свободно";
  return `${occ.lineCount} поз.`;
}

export function LocationPicker({
  locations,
  valueId,
  onChange,
  placeholder = "Выберите место",
  disabled,
  allowClear = true,
  className,
  occupancyByLocationId,
  preferEmpty = true,
}: LocationPickerProps) {
  const options = [...locations].sort((a, b) => {
    if (Boolean(a.isSystem) !== Boolean(b.isSystem)) return a.isSystem ? 1 : -1;
    if (preferEmpty && occupancyByLocationId) {
      const aEmpty = !(occupancyByLocationId[a.id]?.lineCount > 0);
      const bEmpty = !(occupancyByLocationId[b.id]?.lineCount > 0);
      if (aEmpty !== bEmpty) return aEmpty ? -1 : 1;
    }
    return a.displayCode.localeCompare(b.displayCode, "ru");
  });

  return (
    <Select
      value={valueId ?? (allowClear ? "__none__" : undefined)}
      disabled={disabled}
      onValueChange={(next) => {
        if (next === "__none__") {
          onChange(null);
          return;
        }
        onChange(options.find((location) => location.id === next) ?? null);
      }}
    >
      <SelectTrigger className={cn("h-9 w-full", className)}>
        <SelectValue placeholder={placeholder}>
          <span className="flex min-w-0 items-center gap-2 truncate">
            <MapPin className="size-3.5 shrink-0 opacity-60" />
            <span className="truncate">
              {valueId
                ? options.find((location) => location.id === valueId)?.displayCode ?? placeholder
                : placeholder}
            </span>
          </span>
        </SelectValue>
      </SelectTrigger>
      <SelectContent>
        {allowClear ? <SelectItem value="__none__">Без места</SelectItem> : null}
        {options.map((location) => {
          const label = occupancyLabel(location.id, occupancyByLocationId);
          const occupied = (occupancyByLocationId?.[location.id]?.lineCount ?? 0) > 0;
          return (
            <SelectItem key={location.id} value={location.id}>
              <span className="flex w-full items-center justify-between gap-3">
                <span>{location.displayCode}</span>
                <span
                  className={cn(
                    "text-xs",
                    occupied ? "text-amber-600 dark:text-amber-400" : "text-muted-foreground",
                  )}
                >
                  {label}
                </span>
              </span>
            </SelectItem>
          );
        })}
      </SelectContent>
    </Select>
  );
}
