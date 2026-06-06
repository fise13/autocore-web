import { RefObject, useEffect } from "react";

const EDGE_PX = 48;
const EDGE_SCROLL_STEP = 18;

type UseGridScrollWhileDragOptions = {
  bodyRef: RefObject<HTMLDivElement | null>;
  isDragging: () => boolean;
};

export function useGridScrollWhileDrag({ bodyRef, isDragging }: UseGridScrollWhileDragOptions) {
  useEffect(() => {
    function onWheel(event: WheelEvent) {
      if (!bodyRef.current) return;
      const viewport = bodyRef.current;
      if (!viewport.contains(event.target as Node)) return;
      viewport.scrollTop += event.deltaY;
      viewport.scrollLeft += event.deltaX;
    }

    function onPointerMove(event: PointerEvent) {
      if (!isDragging() || !bodyRef.current) return;
      const viewport = bodyRef.current;
      const rect = viewport.getBoundingClientRect();

      if (event.clientY < rect.top + EDGE_PX) {
        viewport.scrollTop -= EDGE_SCROLL_STEP;
      } else if (event.clientY > rect.bottom - EDGE_PX) {
        viewport.scrollTop += EDGE_SCROLL_STEP;
      }

      if (event.clientX < rect.left + EDGE_PX) {
        viewport.scrollLeft -= EDGE_SCROLL_STEP;
      } else if (event.clientX > rect.right - EDGE_PX) {
        viewport.scrollLeft += EDGE_SCROLL_STEP;
      }
    }

    window.addEventListener("wheel", onWheel, { passive: true });
    window.addEventListener("pointermove", onPointerMove);
    return () => {
      window.removeEventListener("wheel", onWheel);
      window.removeEventListener("pointermove", onPointerMove);
    };
  }, [bodyRef, isDragging]);
}
