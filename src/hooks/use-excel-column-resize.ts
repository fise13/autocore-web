"use client";

import { type MouseEvent as ReactMouseEvent, useCallback, useEffect, useRef, useState } from "react";

import { clampExcelColumnWidth, MIN_EXCEL_COLUMN_WIDTH } from "@/lib/grid/column-resize";

type DragState = {
  columnId: string;
  startX: number;
  startWidth: number;
};

export function useExcelColumnResize(minWidth = MIN_EXCEL_COLUMN_WIDTH) {
  const [widthOverrides, setWidthOverrides] = useState<Record<string, number>>({});
  const [isResizing, setIsResizing] = useState(false);
  const dragRef = useRef<DragState | null>(null);
  const rafRef = useRef<number | null>(null);
  const pendingWidthRef = useRef<number | null>(null);

  const flushPendingWidth = useCallback(() => {
    rafRef.current = null;
    const drag = dragRef.current;
    const width = pendingWidthRef.current;
    if (!drag || width == null) return;
    setWidthOverrides((current) =>
      current[drag.columnId] === width ? current : { ...current, [drag.columnId]: width },
    );
  }, []);

  const beginColumnResize = useCallback(
    (columnId: string, currentWidth: number, event: ReactMouseEvent) => {
      event.preventDefault();
      event.stopPropagation();
      dragRef.current = {
        columnId,
        startX: event.clientX,
        startWidth: currentWidth,
      };
      pendingWidthRef.current = currentWidth;
      setIsResizing(true);
    },
    [],
  );

  useEffect(() => {
    if (!isResizing) return;

    const previousUserSelect = document.body.style.userSelect;
    const previousCursor = document.body.style.cursor;
    document.body.style.userSelect = "none";
    document.body.style.cursor = "col-resize";

    function onMouseMove(event: MouseEvent) {
      const drag = dragRef.current;
      if (!drag) return;
      pendingWidthRef.current = clampExcelColumnWidth(
        drag.startWidth + (event.clientX - drag.startX),
        minWidth,
      );
      if (rafRef.current == null) {
        rafRef.current = window.requestAnimationFrame(flushPendingWidth);
      }
    }

    function onMouseUp() {
      if (rafRef.current != null) {
        window.cancelAnimationFrame(rafRef.current);
        rafRef.current = null;
      }
      flushPendingWidth();
      dragRef.current = null;
      pendingWidthRef.current = null;
      setIsResizing(false);
    }

    window.addEventListener("mousemove", onMouseMove);
    window.addEventListener("mouseup", onMouseUp);
    return () => {
      window.removeEventListener("mousemove", onMouseMove);
      window.removeEventListener("mouseup", onMouseUp);
      if (rafRef.current != null) {
        window.cancelAnimationFrame(rafRef.current);
        rafRef.current = null;
      }
      document.body.style.userSelect = previousUserSelect;
      document.body.style.cursor = previousCursor;
    };
  }, [flushPendingWidth, isResizing, minWidth]);

  return { widthOverrides, isResizing, beginColumnResize };
}
