"use client";

import { usePathname, useRouter } from "next/navigation";
import {
  createContext,
  ReactNode,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
} from "react";

import { AppLogo } from "@/components/brand/app-logo";
import {
  peekAuthSessionTransition,
  playAuthSessionEnter,
} from "@/lib/motion/auth-session-transition";
import {
  CrossRouteDirection,
  markCrossRouteTransition,
  mountCrossRouteOverlay,
  peekCrossRouteTransition,
  playCrossRouteEnter,
  playCrossRouteLeave,
  prefersReducedMotion,
  resolveCrossRouteDirection,
} from "@/lib/motion/cross-route-transition";

type PageTransitionContextValue = {
  isTransitioning: boolean;
  navigateWithTransition: (href: string, direction: CrossRouteDirection) => Promise<void>;
};

const PageTransitionContext = createContext<PageTransitionContextValue | null>(null);

type PageTransitionProviderProps = {
  children: ReactNode;
};

export function PageTransitionProvider({ children }: PageTransitionProviderProps) {
  const pathname = usePathname();
  const router = useRouter();
  const [isTransitioning, setIsTransitioning] = useState(false);
  const isTransitioningRef = useRef(false);

  const navigateWithTransition = useCallback(
    async (href: string, direction: CrossRouteDirection) => {
      if (isTransitioningRef.current) return;

      let nextHref: string;
      try {
        const target = new URL(href, window.location.origin);
        nextHref = target.pathname + target.search + target.hash;
      } catch {
        return;
      }

      if (prefersReducedMotion()) {
        router.push(nextHref);
        return;
      }

      isTransitioningRef.current = true;
      setIsTransitioning(true);

      try {
        await playCrossRouteLeave(direction);
        markCrossRouteTransition(direction);
        router.push(nextHref);
      } finally {
        isTransitioningRef.current = false;
        setIsTransitioning(false);
      }
    },
    [router],
  );

  useEffect(() => {
    const onClick = (event: MouseEvent) => {
      if (event.defaultPrevented) return;
      if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
      if (event.button !== 0) return;

      const anchor = (event.target as Element | null)?.closest("a[href]");
      if (!(anchor instanceof HTMLAnchorElement)) return;
      if (anchor.target === "_blank" || anchor.hasAttribute("download")) return;
      if (anchor.dataset.pageTransitionIgnore !== undefined) return;

      const direction = resolveCrossRouteDirection(pathname, anchor.href);
      if (!direction) return;

      event.preventDefault();
      void navigateWithTransition(anchor.href, direction);
    };

    document.addEventListener("click", onClick, true);
    return () => document.removeEventListener("click", onClick, true);
  }, [navigateWithTransition, pathname]);

  useEffect(() => {
    const direction = peekCrossRouteTransition();
    if (direction) {
      void playCrossRouteEnter(direction);
      return;
    }

    const authSession = peekAuthSessionTransition();
    if (authSession) {
      void playAuthSessionEnter(authSession);
    }
  }, [pathname]);

  const value: PageTransitionContextValue = {
    isTransitioning,
    navigateWithTransition,
  };

  return (
    <PageTransitionContext.Provider value={value}>
      {children}
      <div
        ref={mountCrossRouteOverlay}
        className="page-transition-overlay"
        aria-hidden
      >
        <div data-transition-panel className="page-transition-panel">
          <div className="page-transition-panel-glow" aria-hidden />
          <div data-transition-accent className="page-transition-accent" aria-hidden />
          <div data-transition-logo className="page-transition-logo">
            <AppLogo size={36} priority />
          </div>
        </div>
      </div>
    </PageTransitionContext.Provider>
  );
}

export function usePageTransition(): PageTransitionContextValue {
  const context = useContext(PageTransitionContext);
  if (!context) {
    throw new Error("usePageTransition must be used within PageTransitionProvider.");
  }
  return context;
}
