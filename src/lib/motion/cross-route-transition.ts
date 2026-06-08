import { gsap } from "gsap";

export const CROSS_ROUTE_STORAGE_KEY = "autocore-cross-route";

export type CrossRouteDirection = "to-auth" | "to-marketing";

type OverlayElements = {
  root: HTMLElement;
  panel: HTMLElement;
  logo: HTMLElement;
  accent: HTMLElement;
};

let overlayElements: OverlayElements | null = null;
let enterInFlight = false;

export function prefersReducedMotion(): boolean {
  return (
    typeof window !== "undefined" &&
    window.matchMedia("(prefers-reduced-motion: reduce)").matches
  );
}

export function mountCrossRouteOverlay(root: HTMLElement | null): void {
  if (!root) {
    overlayElements = null;
    return;
  }
  const panel = root.querySelector<HTMLElement>("[data-transition-panel]");
  const logo = root.querySelector<HTMLElement>("[data-transition-logo]");
  const accent = root.querySelector<HTMLElement>("[data-transition-accent]");
  if (!panel || !logo || !accent) return;
  overlayElements = { root, panel, logo, accent };
}

export function markCrossRouteTransition(direction: CrossRouteDirection): void {
  sessionStorage.setItem(CROSS_ROUTE_STORAGE_KEY, direction);
}

export function peekCrossRouteTransition(): CrossRouteDirection | null {
  const value = sessionStorage.getItem(CROSS_ROUTE_STORAGE_KEY);
  if (value === "to-auth" || value === "to-marketing") return value;
  return null;
}

export function consumeCrossRouteTransition(): CrossRouteDirection | null {
  const value = peekCrossRouteTransition();
  sessionStorage.removeItem(CROSS_ROUTE_STORAGE_KEY);
  return value;
}

export function resolveCrossRouteDirection(
  fromPathname: string,
  targetHref: string,
): CrossRouteDirection | null {
  if (typeof window === "undefined") return null;

  try {
    const target = new URL(targetHref, window.location.origin);
    if (target.origin !== window.location.origin) return null;

    const toAuth =
      target.pathname === "/login" ||
      target.pathname.startsWith("/login/") ||
      target.pathname === "/demo" ||
      target.pathname.startsWith("/demo/");
    const toMarketing =
      target.pathname === "/marketing" || target.pathname.startsWith("/marketing/");
    const fromMarketing =
      fromPathname === "/marketing" || fromPathname.startsWith("/marketing/");
    const fromAuth =
      fromPathname === "/login" ||
      fromPathname.startsWith("/login/") ||
      fromPathname === "/demo" ||
      fromPathname.startsWith("/demo/");

    if (fromMarketing && toAuth) return "to-auth";
    if (fromAuth && toMarketing) return "to-marketing";
    return null;
  } catch {
    return null;
  }
}

function getLeaveTarget(direction: CrossRouteDirection): HTMLElement | null {
  if (direction === "to-auth") {
    return document.querySelector<HTMLElement>('[data-barba="wrapper"]');
  }
  return document.querySelector<HTMLElement>("[data-login-screen]");
}

function getEnterSelector(direction: CrossRouteDirection): string {
  return direction === "to-auth" ? "[data-login-screen]" : '[data-barba="wrapper"]';
}

export async function waitForTransitionTarget(
  selector: string,
  maxMs = 2200,
): Promise<HTMLElement | null> {
  const started = performance.now();
  while (performance.now() - started < maxMs) {
    const element = document.querySelector<HTMLElement>(selector);
    if (element) return element;
    await new Promise<void>((resolve) => requestAnimationFrame(() => resolve()));
  }
  return null;
}

function requireOverlay(): OverlayElements {
  if (!overlayElements) {
    throw new Error("Cross-route overlay is not mounted.");
  }
  return overlayElements;
}

export async function playCrossRouteLeave(
  direction: CrossRouteDirection,
  leaveTarget?: HTMLElement | null,
): Promise<void> {
  if (prefersReducedMotion()) return;

  const { root, panel, logo, accent } = requireOverlay();
  const target = leaveTarget ?? getLeaveTarget(direction);

  gsap.set(root, { visibility: "visible", pointerEvents: "auto" });
  gsap.set(panel, {
    xPercent: direction === "to-auth" ? 100 : -100,
    opacity: 1,
  });
  gsap.set(logo, { opacity: 0, scale: 0.88, y: 8 });
  gsap.set(accent, { scaleX: 0, transformOrigin: "0% 50%" });

  const timeline = gsap.timeline();

  if (target) {
    timeline.to(
      target,
      {
        opacity: 0.35,
        y: direction === "to-auth" ? -28 : 24,
        scale: 0.985,
        filter: "blur(8px)",
        duration: 0.42,
        ease: "power2.in",
      },
      0,
    );
  }

  timeline.to(
    panel,
    {
      xPercent: 0,
      duration: 0.62,
      ease: "power3.inOut",
    },
    0.06,
  );

  timeline.to(
    accent,
    {
      scaleX: 1,
      duration: 0.48,
      ease: "power2.out",
    },
    0.18,
  );

  timeline.to(
    logo,
    {
      opacity: 1,
      scale: 1,
      y: 0,
      duration: 0.38,
      ease: "power3.out",
    },
    0.24,
  );

  await timeline;
}

export async function playCrossRouteEnter(
  direction: CrossRouteDirection,
  enterTarget?: HTMLElement | null,
): Promise<void> {
  if (enterInFlight) return;
  enterInFlight = true;

  try {
    if (prefersReducedMotion()) {
      consumeCrossRouteTransition();
      return;
    }

    if (!peekCrossRouteTransition()) return;

  const { root, panel, logo, accent } = requireOverlay();
  const target = enterTarget ?? (await waitForTransitionTarget(getEnterSelector(direction)));

  gsap.set(root, { visibility: "visible", pointerEvents: "auto" });
  gsap.set(panel, { xPercent: 0, opacity: 1 });
  gsap.set(logo, { opacity: 1, scale: 1, y: 0 });
  gsap.set(accent, { scaleX: 1, transformOrigin: "100% 50%" });

  if (target) {
    gsap.set(target, {
      opacity: 0,
      y: direction === "to-auth" ? 32 : 24,
      scale: 0.992,
      filter: "blur(4px)",
    });
  }

  const revealItems = target?.querySelectorAll<HTMLElement>("[data-page-reveal]") ?? [];

  if (revealItems.length) {
    gsap.set(revealItems, { opacity: 0, y: 18 });
  }

  const timeline = gsap.timeline();

  timeline.to(
    logo,
    {
      opacity: 0,
      scale: 0.94,
      y: direction === "to-auth" ? -10 : 10,
      duration: 0.22,
      ease: "power2.in",
    },
    0,
  );

  timeline.to(
    accent,
    {
      scaleX: 0,
      duration: 0.34,
      ease: "power2.in",
    },
    0.02,
  );

  timeline.to(
    panel,
    {
      xPercent: direction === "to-auth" ? -100 : 100,
      duration: 0.68,
      ease: "power3.inOut",
    },
    0.08,
  );

  if (target) {
    timeline.to(
      target,
      {
        opacity: 1,
        y: 0,
        scale: 1,
        filter: "blur(0px)",
        duration: 0.58,
        ease: "power3.out",
        clearProps: "filter",
      },
      0.22,
    );
  }

  if (revealItems.length) {
    timeline.to(
      revealItems,
      {
        opacity: 1,
        y: 0,
        duration: 0.46,
        stagger: 0.07,
        ease: "power2.out",
      },
      0.34,
    );
  }

  timeline.eventCallback("onComplete", () => {
    gsap.set(root, { visibility: "hidden", pointerEvents: "none" });
    gsap.set(panel, { clearProps: "transform,opacity" });
    gsap.set(logo, { clearProps: "opacity,transform" });
    gsap.set(accent, { clearProps: "transform" });
    if (target) {
      gsap.set(target, { clearProps: "opacity,transform,filter" });
    }
    if (revealItems.length) {
      gsap.set(revealItems, { clearProps: "opacity,transform" });
    }
  });

  await timeline;
  consumeCrossRouteTransition();
  } finally {
    enterInFlight = false;
  }
}
