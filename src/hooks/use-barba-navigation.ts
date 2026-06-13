"use client";

import { usePathname, useRouter } from "next/navigation";
import { useEffect, useRef } from "react";

import {
  notifyInstantCacheEnter,
  resolveRouteCacheKey,
} from "@/components/layout/dashboard-route-cache";
import { initBarbaRuntime, runBarbaEnter, runBarbaLeave } from "@/lib/barba/barba-runtime";
import { peekCrossRouteTransition } from "@/lib/motion/cross-route-transition";
import { isInstantCacheNavigation } from "@/lib/performance/route-cache-store";

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
  const skipEnterRef = useRef(false);

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
      if (peekCrossRouteTransition() !== "to-marketing") {
        void runBarbaEnter(container, href);
      }
      return;
    }

    if (previousPathRef.current === pathname) return;

    const fromPath = previousPathRef.current;
    previousPathRef.current = pathname;

    if (peekCrossRouteTransition() === "to-marketing") return;

    if (skipEnterRef.current) {
      skipEnterRef.current = false;
      notifyInstantCacheEnter(pathname);
      return;
    }

    if (isInstantCacheNavigation(fromPath, pathname)) {
      notifyInstantCacheEnter(pathname);
      return;
    }

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

      const instant = isInstantCacheNavigation(pathname, target.pathname);

      if (instant) {
        skipEnterRef.current = true;
        router.push(nextHref);
        notifyInstantCacheEnter(target.pathname);
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

export function shouldPrefetchRoute(pathname: string, tier: "high" | "balanced" | "low"): boolean {
  if (tier === "low") {
    return ["/", "/motors", "/work-orders"].includes(pathname);
  }
  return resolveRouteCacheKey(pathname) !== null;
}
