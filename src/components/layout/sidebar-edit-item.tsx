"use client";

import { Minus, type LucideIcon } from "lucide-react";
import type { DragEvent as ReactDragEvent } from "react";

import { SidebarNavRow } from "@/components/layout/sidebar-nav-row";
import { cn } from "@/lib/utils";

export function reorderList<T>(list: T[], fromIndex: number, toIndex: number): T[] {
  if (fromIndex === toIndex || fromIndex < 0 || toIndex < 0) return list;
  const next = [...list];
  const [item] = next.splice(fromIndex, 1);
  next.splice(toIndex, 0, item);
  return next;
}

type SidebarEditItemProps = {
  icon: LucideIcon;
  label: string;
  hint?: string;
  onRemove: () => void;
  dragging?: boolean;
  jiggleDelay?: number;
  jiggle?: boolean;
  onDragStart?: () => void;
  onDragEnd?: () => void;
  onDrop?: () => void;
  className?: string;
};

export function SidebarEditItem({
  icon,
  label,
  hint,
  onRemove,
  dragging = false,
  jiggleDelay = 0,
  jiggle = true,
  onDragStart,
  onDragEnd,
  onDrop,
  className,
}: SidebarEditItemProps) {
  return (
    <div
      className={cn(
        "group relative opacity-100",
        jiggle && !dragging && "animate-sidebar-jiggle",
        dragging && "animate-none opacity-80",
        className,
      )}
      style={{ animationDelay: `${jiggleDelay}s` }}
    >
      <button
        type="button"
        onClick={(event) => {
          event.stopPropagation();
          onRemove();
        }}
        className="absolute left-0 top-1/2 z-10 flex size-3.5 -translate-y-1/2 items-center justify-center rounded-full text-muted-foreground transition-colors hover:bg-destructive/10 hover:text-destructive"
        title="Убрать"
      >
        <Minus className="size-2.5" strokeWidth={2.5} />
      </button>

      <div
        draggable
        onDragStart={(event: ReactDragEvent<HTMLDivElement>) => {
          event.dataTransfer.effectAllowed = "move";
          onDragStart?.();
        }}
        onDragEnd={onDragEnd}
        onDragOver={(event) => {
          event.preventDefault();
        }}
        onDrop={(event) => {
          event.preventDefault();
          onDrop?.();
        }}
        className="cursor-grab pl-3 active:cursor-grabbing"
      >
        <SidebarNavRow icon={icon} label={label} hint={hint} />
      </div>
    </div>
  );
}
