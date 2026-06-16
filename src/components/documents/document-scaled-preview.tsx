"use client";

import { useEffect, useRef, useState, type ReactNode, type RefObject } from "react";

import {
  PDF_A4_HEIGHT_PX as DOCUMENT_PAGE_HEIGHT_PX,
  PDF_A4_WIDTH_PX as DOCUMENT_PAGE_WIDTH_PX,
} from "@/lib/documents/fit-pdf-page";

export { DOCUMENT_PAGE_HEIGHT_PX, DOCUMENT_PAGE_WIDTH_PX };

export function useDocumentPreviewScale(
  viewportRef: RefObject<HTMLElement | null>,
  maxScale = 0.95,
  active = true,
) {
  const [scale, setScale] = useState(0.48);

  useEffect(() => {
    if (!active) return;

    let observer: ResizeObserver | null = null;
    let frame = 0;

    const update = () => {
      const node = viewportRef.current;
      if (!node) return;
      const available = Math.max(240, node.clientWidth - 24);
      const next = Math.min(maxScale, Math.max(0.34, available / DOCUMENT_PAGE_WIDTH_PX));
      setScale(next);
    };

    const attach = () => {
      const node = viewportRef.current;
      if (!node) {
        frame = window.requestAnimationFrame(attach);
        return;
      }
      update();
      observer = new ResizeObserver(update);
      observer.observe(node);
    };

    attach();
    return () => {
      if (frame) window.cancelAnimationFrame(frame);
      observer?.disconnect();
    };
  }, [viewportRef, maxScale, active]);

  return scale;
}

export function DocumentScaledPreviewFrame({
  scale,
  children,
  pageHeight = DOCUMENT_PAGE_HEIGHT_PX,
}: {
  scale: number;
  children: ReactNode;
  pageHeight?: number;
}) {
  return (
    <div
      className="branding-preview-scale-outer"
      style={{ height: Math.round(pageHeight * scale) }}
    >
      <div
        className="branding-preview-scale-inner"
        style={{
          width: DOCUMENT_PAGE_WIDTH_PX,
          transform: `translateX(-50%) scale(${scale})`,
          transformOrigin: "top center",
        }}
      >
        {children}
      </div>
    </div>
  );
}
