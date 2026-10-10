"use client";

import type { CSSProperties, MouseEvent as ReactMouseEvent, ReactNode } from "react";

import { cn } from "@/lib/utils";
import { gridCellAlignClass, type GridColumnAlign } from "@/lib/grid/grid-types";

type ExcelColumnResizerProps = {
  onMouseDown: (event: ReactMouseEvent) => void;
};

export function ExcelColumnResizer({ onMouseDown }: ExcelColumnResizerProps) {
  return (
    <span
      role="separator"
      aria-orientation="vertical"
      data-excel-col-resizer
      className="absolute top-0 right-0 z-20 h-full w-1.5 cursor-col-resize touch-none opacity-0 group-hover:opacity-100 hover:bg-primary/40"
      onMouseDown={onMouseDown}
      onClick={(event) => event.stopPropagation()}
    />
  );
}

type ExcelGridHeaderCellProps = {
  title: string;
  width: number;
  left: number;
  height: number;
  fontSize: number;
  align?: GridColumnAlign;
  buttonClassName?: string;
  className?: string;
  style?: CSSProperties;
  pinned?: boolean;
  onSelectColumn?: () => void;
  onResizeMouseDown: (event: ReactMouseEvent) => void;
  children?: ReactNode;
};

export function ExcelGridHeaderCell({
  title,
  width,
  left,
  height,
  fontSize,
  align = "left",
  buttonClassName,
  className,
  style,
  pinned = false,
  onSelectColumn,
  onResizeMouseDown,
  children,
}: ExcelGridHeaderCellProps) {
  return (
    <div
      className={cn("group absolute top-0", pinned && "bg-muted", className)}
      style={{ left, width, height, ...style }}
    >
      <button
        type="button"
        className={cn(
          "flex h-full w-full border-r px-2.5 font-semibold text-muted-foreground",
          gridCellAlignClass(align),
          buttonClassName,
        )}
        style={{ fontSize }}
        onClick={onSelectColumn}
      >
        {children ?? title}
      </button>
      <ExcelColumnResizer onMouseDown={onResizeMouseDown} />
    </div>
  );
}
