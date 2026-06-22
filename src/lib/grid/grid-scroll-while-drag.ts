import { RefObject, useEffect, useRef } from "react";

const EDGE_PX = 56;
const MIN_SCROLL_SPEED = 6;
const MAX_SCROLL_SPEED = 32;

function edgeScrollDelta(pointer: number, edgeStart: number, edgeEnd: number): number {
  if (pointer < edgeStart + EDGE_PX) {
    const depth = Math.min(1, (edgeStart + EDGE_PX - pointer) / EDGE_PX);
    return -Math.round(MIN_SCROLL_SPEED + depth * (MAX_SCROLL_SPEED - MIN_SCROLL_SPEED));
  }
  if (pointer > edgeEnd - EDGE_PX) {
    const depth = Math.min(1, (pointer - (edgeEnd - EDGE_PX)) / EDGE_PX);
    return Math.round(MIN_SCROLL_SPEED + depth * (MAX_SCROLL_SPEED - MIN_SCROLL_SPEED));
  }
  return 0;
}

export function applyGridEdgeScroll(
  viewport: HTMLElement,
  clientX: number,
  clientY: number,
): boolean {
  const rect = viewport.getBoundingClientRect();
  const deltaY = edgeScrollDelta(clientY, rect.top, rect.bottom);
  const deltaX = edgeScrollDelta(clientX, rect.left, rect.right);
  if (!deltaY && !deltaX) return false;

  if (deltaY) {
    viewport.scrollTop = Math.max(0, viewport.scrollTop + deltaY);
  }
  if (deltaX) {
    viewport.scrollLeft = Math.max(0, viewport.scrollLeft + deltaX);
  }
  return true;
}

type UseGridScrollWhileDragOptions = {
  bodyRef: RefObject<HTMLDivElement | null>;
  isDragging: () => boolean;
  onAutoScrollTick?: () => void;
};

export function useGridScrollWhileDrag({
  bodyRef,
  isDragging,
  onAutoScrollTick,
}: UseGridScrollWhileDragOptions) {
  const lastPointerRef = useRef({ x: 0, y: 0 });
  const rafRef = useRef(0);
  const onAutoScrollTickRef = useRef(onAutoScrollTick);

  useEffect(() => {
    onAutoScrollTickRef.current = onAutoScrollTick;
  }, [onAutoScrollTick]);

  useEffect(() => {
    function tick() {
      const viewport = bodyRef.current;
      if (!viewport || !isDragging()) {
        rafRef.current = 0;
        return;
      }

      const scrolled = applyGridEdgeScroll(
        viewport,
        lastPointerRef.current.x,
        lastPointerRef.current.y,
      );
      if (scrolled) {
        onAutoScrollTickRef.current?.();
      }

      rafRef.current = requestAnimationFrame(tick);
    }

    function ensureScrollLoop() {
      if (rafRef.current || !isDragging()) return;
      rafRef.current = requestAnimationFrame(tick);
    }

    function onWheel(event: WheelEvent) {
      if (!bodyRef.current) return;
      const viewport = bodyRef.current;
      if (!viewport.contains(event.target as Node)) return;
      viewport.scrollTop += event.deltaY;
      viewport.scrollLeft += event.deltaX;
    }

    function onPointerMove(event: PointerEvent) {
      lastPointerRef.current = { x: event.clientX, y: event.clientY };
      if (!bodyRef.current || !isDragging()) return;

      const scrolled = applyGridEdgeScroll(bodyRef.current, event.clientX, event.clientY);
      if (scrolled) {
        onAutoScrollTickRef.current?.();
      }
      ensureScrollLoop();
    }

    function onPointerUp() {
      if (rafRef.current) {
        cancelAnimationFrame(rafRef.current);
        rafRef.current = 0;
      }
    }

    window.addEventListener("wheel", onWheel, { passive: true });
    window.addEventListener("pointermove", onPointerMove);
    window.addEventListener("pointerup", onPointerUp);
    window.addEventListener("pointercancel", onPointerUp);
    return () => {
      window.removeEventListener("wheel", onWheel);
      window.removeEventListener("pointermove", onPointerMove);
      window.removeEventListener("pointerup", onPointerUp);
      window.removeEventListener("pointercancel", onPointerUp);
      if (rafRef.current) {
        cancelAnimationFrame(rafRef.current);
        rafRef.current = 0;
      }
    };
  }, [bodyRef, isDragging]);
}
