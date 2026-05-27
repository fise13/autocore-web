"use client";

import { ReactNode, useCallback, useEffect, useRef } from "react";

import { cn } from "@/lib/utils";

type ResizableSidebarProps = {
  children: ReactNode;
  visible: boolean;
  width: number;
  onWidthChange: (width: number) => void;
};

export function ResizableSidebar({ children, visible, width, onWidthChange }: ResizableSidebarProps) {
  const draggingRef = useRef(false);
  const startXRef = useRef(0);
  const startWidthRef = useRef(width);
  const onPointerMoveRef = useRef<(event: PointerEvent) => void>(() => {});
  const stopDraggingRef = useRef<() => void>(() => {});

  const onPointerMove = useCallback(
    (event: PointerEvent) => {
      if (!draggingRef.current) return;
      const delta = event.clientX - startXRef.current;
      onWidthChange(startWidthRef.current + delta);
    },
    [onWidthChange],
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
      event.preventDefault();
      draggingRef.current = true;
      startXRef.current = event.clientX;
      startWidthRef.current = width;
      document.body.style.cursor = "col-resize";
      document.body.style.userSelect = "none";
      window.addEventListener("pointermove", onPointerMoveRef.current);
      window.addEventListener("pointerup", stopDraggingRef.current);
    },
    [width],
  );

  useEffect(() => () => stopDragging(), [stopDragging]);

  return (
    <aside
      className={cn(
        "relative hidden h-full shrink-0 overflow-hidden border-r bg-sidebar transition-[width,opacity,transform] duration-300 ease-in-out motion-reduce:transition-none md:flex md:flex-col",
        visible ? "translate-x-0 opacity-100" : "pointer-events-none -translate-x-2 opacity-0",
      )}
      style={{ width: visible ? width : 0 }}
      aria-hidden={!visible}
    >
      <div className="flex h-full min-w-[220px] flex-col" style={{ width }}>
        {children}
      </div>
      {visible ? (
        <div
          role="separator"
          aria-orientation="vertical"
          aria-label="Изменить ширину боковой панели"
          onPointerDown={startDragging}
          className={cn(
            "absolute top-0 -right-1 z-20 h-full w-2 cursor-col-resize",
            "hover:bg-primary/10 active:bg-primary/20",
          )}
        />
      ) : null}
    </aside>
  );
}
