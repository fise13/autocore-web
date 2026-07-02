"use client";

import { useEffect, useRef } from "react";

type UseMouseDepthOptions = {
  maxRotate?: number;
  maxTranslate?: number;
  enabled?: boolean;
};

export function useMouseDepth<T extends HTMLElement>({
  maxRotate = 8,
  maxTranslate = 12,
  enabled = true,
}: UseMouseDepthOptions = {}) {
  const ref = useRef<T>(null);

  useEffect(() => {
    if (!enabled) return;
    const el = ref.current;
    if (!el) return;

    const onMove = (event: MouseEvent) => {
      const rect = el.getBoundingClientRect();
      const x = (event.clientX - rect.left) / rect.width - 0.5;
      const y = (event.clientY - rect.top) / rect.height - 0.5;
      const rotateY = x * maxRotate;
      const rotateX = -y * maxRotate;
      const translateX = x * maxTranslate;
      const translateY = y * maxTranslate;
      el.style.transform = `perspective(1200px) rotateX(${rotateX}deg) rotateY(${rotateY}deg) translate3d(${translateX}px, ${translateY}px, 0)`;
    };

    const onLeave = () => {
      el.style.transform = "perspective(1200px) rotateX(0deg) rotateY(0deg) translate3d(0, 0, 0)";
    };

    el.addEventListener("mousemove", onMove);
    el.addEventListener("mouseleave", onLeave);
    return () => {
      el.removeEventListener("mousemove", onMove);
      el.removeEventListener("mouseleave", onLeave);
    };
  }, [enabled, maxRotate, maxTranslate]);

  return ref;
}
