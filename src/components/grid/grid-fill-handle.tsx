"use client";

import type { PointerEvent as ReactPointerEvent } from "react";

type GridFillHandleProps = {
  x: number;
  y: number;
  size?: number;
  onPointerDown: (event: ReactPointerEvent<HTMLDivElement>) => void;
  onDoubleClick: () => void;
};

export function GridFillHandle({ x, y, size = 8, onPointerDown, onDoubleClick }: GridFillHandleProps) {
  return (
    <div
      role="button"
      tabIndex={-1}
      aria-label="Автозаполнение"
      className="absolute z-20 cursor-crosshair rounded-[2px] border border-white bg-emerald-600 shadow-[0_0_0_1px_rgba(0,0,0,0.08)] transition-transform duration-150 hover:scale-125 motion-reduce:transition-none motion-reduce:hover:scale-100"
      style={{
        left: x,
        top: y,
        width: size,
        height: size,
      }}
      onPointerDown={onPointerDown}
      onDoubleClick={onDoubleClick}
    />
  );
}
