"use client";

import { motion } from "framer-motion";
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
  layoutId: string;
  icon: LucideIcon;
  label: string;
  hint?: string;
  onRemove: () => void;
  dragging?: boolean;
  jiggleDelay?: number;
  onDragStart?: () => void;
  onDragEnd?: () => void;
  onDrop?: () => void;
  className?: string;
};

export function SidebarEditItem({
  layoutId,
  icon,
  label,
  hint,
  onRemove,
  dragging = false,
  jiggleDelay = 0,
  onDragStart,
  onDragEnd,
  onDrop,
  className,
}: SidebarEditItemProps) {
  return (
    <motion.div
      layout
      layoutId={layoutId}
      initial={{ opacity: 0, height: 0 }}
      animate={{ opacity: 1, height: "auto" }}
      exit={{ opacity: 0, height: 0 }}
      transition={{ duration: 0.2, ease: [0.22, 1, 0.36, 1] }}
      className={cn(
        "group relative",
        !dragging && "animate-sidebar-jiggle",
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
    </motion.div>
  );
}
