"use client";

import { type MouseEvent as ReactMouseEvent, useCallback, useEffect, useRef, useState } from "react";

import {
  clampExcelColumnWidth,
  MAX_EXCEL_COLUMN_WIDTH,
  MIN_EXCEL_COLUMN_WIDTH,
} from "@/lib/grid/column-resize";
import { readStoredColumnWidths, writeStoredColumnWidths } from "@/lib/grid/column-width-storage";

type DragState = {
  columnId: string;
  startX: number;
  startWidth: number;
  minWidth: number;
  maxWidth: number;
};

type ExcelColumnResizeOptions = {
  minWidth?: number;
  storageKey?: string;
};

export function useExcelColumnResize(minWidthOrOptions: number | ExcelColumnResizeOptions = MIN_EXCEL_COLUMN_WIDTH) {
  const minWidth =
    typeof minWidthOrOptions === "number"
      ? minWidthOrOptions
      : (minWidthOrOptions.minWidth ?? MIN_EXCEL_COLUMN_WIDTH);
  const storageKey = typeof minWidthOrOptions === "object" ? minWidthOrOptions.storageKey : undefined;

  const [widthOverrides, setWidthOverrides] = useState<Record<string, number>>({});
  const [isResizing, setIsResizing] = useState(false);
  const dragRef = useRef<DragState | null>(null);
  const rafRef = useRef<number | null>(null);
  const pendingWidthRef = useRef<number | null>(null);
  const widthsRef = useRef<Record<string, number>>({});

  useEffect(() => {
    widthsRef.current = widthOverrides;
  }, [widthOverrides]);

  useEffect(() => {
    if (!storageKey) return;
    const stored = readStoredColumnWidths(storageKey);
    if (Object.keys(stored).length === 0) return;
    setWidthOverrides((current) => (Object.keys(current).length === 0 ? stored : current));
  }, [storageKey]);

  const flushPendingWidth = useCallback(() => {
    rafRef.current = null;
    const drag = dragRef.current;
    const width = pendingWidthRef.current;
    if (!drag || width == null) return;
    setWidthOverrides((current) => {
      if (current[drag.columnId] === width) return current;
      const next = { ...current, [drag.columnId]: width };
      widthsRef.current = next;
      return next;
    });
  }, []);

  const beginColumnResize = useCallback(
    (
      columnId: string,
      currentWidth: number,
      event: ReactMouseEvent,
      bounds?: { minWidth?: number; maxWidth?: number },
    ) => {
      event.preventDefault();
      event.stopPropagation();
      dragRef.current = {
        columnId,
        startX: event.clientX,
        startWidth: currentWidth,
        minWidth: bounds?.minWidth ?? minWidth,
        maxWidth: bounds?.maxWidth ?? MAX_EXCEL_COLUMN_WIDTH,
      };
      pendingWidthRef.current = currentWidth;
      setIsResizing(true);
    },
    [minWidth],
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
        drag.minWidth,
        drag.maxWidth,
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
      const drag = dragRef.current;
      const width = pendingWidthRef.current;
      if (drag && width != null) {
        const next = { ...widthsRef.current, [drag.columnId]: width };
        widthsRef.current = next;
        setWidthOverrides(next);
        if (storageKey) writeStoredColumnWidths(storageKey, next);
      }
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
  }, [flushPendingWidth, isResizing, storageKey]);

  return { widthOverrides, isResizing, beginColumnResize };
}
