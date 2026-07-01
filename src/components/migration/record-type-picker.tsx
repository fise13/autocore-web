"use client";

import { ChevronsUpDown } from "lucide-react";

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { RECORD_TYPE_LABELS, RECORD_TYPES, type RecordType } from "@/lib/import";
import { cn } from "@/lib/utils";

import { recordTypeIcon } from "./record-type-meta";

const SELECTABLE: RecordType[] = RECORD_TYPES.filter((type) => type !== "unknown");

export function RecordTypePicker({
  value,
  onChange,
}: {
  value: RecordType;
  onChange: (type: RecordType) => void;
}) {
  const Icon = recordTypeIcon(value);
  const isUnknown = value === "unknown";

  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        render={
          <button
            type="button"
            className={cn(
              "flex w-full items-center gap-1.5 rounded-md border border-transparent px-1.5 py-1 text-left text-sm transition-colors hover:border-border hover:bg-muted/60",
              isUnknown && "text-muted-foreground",
            )}
          />
        }
      >
        <Icon className={cn("size-3.5 shrink-0", isUnknown ? "text-muted-foreground" : "text-emerald-600")} />
        <span className="min-w-0 flex-1 truncate">{RECORD_TYPE_LABELS[value]}</span>
        <ChevronsUpDown className="size-3 shrink-0 text-muted-foreground/70" />
      </DropdownMenuTrigger>
      <DropdownMenuContent className="w-52">
        {SELECTABLE.map((type) => {
          const ItemIcon = recordTypeIcon(type);
          return (
            <DropdownMenuItem key={type} onClick={() => onChange(type)}>
              <ItemIcon className="text-muted-foreground" />
              <span className="flex-1">{RECORD_TYPE_LABELS[type]}</span>
              {type === value && <span className="size-1.5 rounded-full bg-emerald-500" />}
            </DropdownMenuItem>
          );
        })}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
