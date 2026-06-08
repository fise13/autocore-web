"use client";

import { ReactNode, useCallback, useEffect, useRef } from "react";

import {
  SIDEBAR_COLLAPSED_WIDTH,
  SIDEBAR_MIN_WIDTH,
} from "@/hooks/use-sidebar-layout";
import type { SidebarPosition } from "@/lib/navigation/sidebar-customization";
import { cn } from "@/lib/utils";

type ResizableSidebarProps = {
  children: ReactNode;
  collapsed: boolean;
  width: number;
  position?: SidebarPosition;
  onWidthChange: (width: number) => void;
};

export function ResizableSidebar({
  children,
  collapsed,
  width,
  position = "left",
  onWidthChange,
}: ResizableSidebarProps) {
  const draggingRef = useRef(false);
  const startXRef = useRef(0);
  const startWidthRef = useRef(width);
  const onPointerMoveRef = useRef<(event: PointerEvent) => void>(() => {});
  const stopDraggingRef = useRef<() => void>(() => {});

  const effectiveWidth = collapsed ? SIDEBAR_COLLAPSED_WIDTH : width;

  const onPointerMove = useCallback(
    (event: PointerEvent) => {
      if (!draggingRef.current || collapsed) return;
      const delta = event.clientX - startXRef.current;
      const signedDelta = position === "right" ? -delta : delta;
      onWidthChange(startWidthRef.current + signedDelta);
    },
    [collapsed, onWidthChange, position],
  );

  const stopDragging = useCallback(() => {
    draggingRef.current = false;
    document.body.style.cursor = "";
    document.body.style.userSelect = "";
    window.removeEventListener("pointermove", onPointerMoveRef.current);
    window.removeEventListener("pointerup", stopDraggingRef.current);
  }, []);

  useEffect(() => {
    onPointerMoveRef.current = onPointerMove;
    stopDraggingRef.current = stopDragging;
  }, [onPointerMove, stopDragging]);

  const startDragging = useCallback(
    (event: React.PointerEvent<HTMLDivElement>) => {
      if (collapsed) return;
      event.preventDefault();
      draggingRef.current = true;
      startXRef.current = event.clientX;
      startWidthRef.current = width;
      document.body.style.cursor = "col-resize";
      document.body.style.userSelect = "none";
      window.addEventListener("pointermove", onPointerMoveRef.current);
      window.addEventListener("pointerup", stopDraggingRef.current);
    },
    [collapsed, width],
  );

  useEffect(() => () => stopDragging(), [stopDragging]);

  return (
    <aside
      data-collapsed={collapsed ? "true" : "false"}
      className={cn(
        "app-sidebar-shell relative hidden h-full shrink-0 overflow-hidden md:flex md:flex-col",
        "transition-[width] duration-200 ease-linear motion-reduce:transition-none",
        position === "right" ? "border-l border-sidebar-border" : "border-r border-sidebar-border",
      )}
      style={{ width: effectiveWidth }}
    >
      <div
        className="flex h-full flex-col bg-sidebar transition-[width] duration-200 ease-linear motion-reduce:transition-none"
        style={{ width: collapsed ? SIDEBAR_COLLAPSED_WIDTH : Math.max(width, SIDEBAR_MIN_WIDTH) }}
      >
        {children}
      </div>
      {!collapsed ? (
        <div
          role="separator"
          aria-orientation="vertical"
          aria-label="Изменить ширину боковой панели"
          onPointerDown={startDragging}
          className={cn(
            "absolute top-0 z-20 h-full w-2 cursor-col-resize opacity-0 transition-opacity duration-200 hover:opacity-100",
            position === "right" ? "-left-1" : "-right-1",
            "hover:bg-primary/10 active:bg-primary/20",
          )}
        />
      ) : null}
    </aside>
  );
}
