"use client";

import { usePathname, useRouter } from "next/navigation";
import { useEffect, useRef } from "react";

import { initBarbaRuntime, runBarbaEnter, runBarbaLeave } from "@/lib/barba/barba-runtime";

type UseBarbaNavigationOptions = {
  shouldAnimate: (target: URL, currentPathname: string) => boolean;
};

export function useBarbaNavigation({ shouldAnimate }: UseBarbaNavigationOptions) {
  const pathname = usePathname();
  const router = useRouter();
  const wrapperRef = useRef<HTMLDivElement>(null);
  const containerRef = useRef<HTMLElement>(null);
  const previousPathRef = useRef(pathname);
  const isFirstRenderRef = useRef(true);
  const isTransitioningRef = useRef(false);

  useEffect(() => {
    void initBarbaRuntime();
  }, []);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const href = window.location.pathname + window.location.search;

    if (isFirstRenderRef.current) {
      isFirstRenderRef.current = false;
      previousPathRef.current = pathname;
      void runBarbaEnter(container, href);
      return;
    }

    if (previousPathRef.current === pathname) return;
    previousPathRef.current = pathname;
    void runBarbaEnter(container, href);
  }, [pathname]);

  useEffect(() => {
    const wrapper = wrapperRef.current;
    if (!wrapper) return;

    const onClick = (event: MouseEvent) => {
      if (event.defaultPrevented) return;
      if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;

      const anchor = (event.target as Element | null)?.closest("a[href]");
      if (!(anchor instanceof HTMLAnchorElement)) return;
      if (anchor.target === "_blank" || anchor.hasAttribute("download")) return;
      if (anchor.dataset.barbaPrevent !== undefined) return;

      let target: URL;
      try {
        target = new URL(anchor.href);
      } catch {
        return;
      }

      if (!shouldAnimate(target, pathname)) return;

      event.preventDefault();
      if (isTransitioningRef.current) return;

      const nextHref = target.pathname + target.search + target.hash;
      const container = containerRef.current;
      if (!container) {
        router.push(nextHref);
        return;
      }

      isTransitioningRef.current = true;
      wrapper.classList.add("barba-transition-running");

      void (async () => {
        try {
          await runBarbaLeave(container, window.location.pathname + window.location.search);
          router.push(nextHref);
        } finally {
          isTransitioningRef.current = false;
          wrapper.classList.remove("barba-transition-running");
        }
      })();
    };

    wrapper.addEventListener("click", onClick);
    return () => wrapper.removeEventListener("click", onClick);
  }, [pathname, router, shouldAnimate]);

  return { wrapperRef, containerRef };
}
