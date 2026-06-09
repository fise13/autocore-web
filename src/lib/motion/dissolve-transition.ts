import { gsap } from "gsap";

export type DissolveOverlay = {
  root: HTMLElement;
  veil: HTMLElement;
};

let dissolveOverlay: DissolveOverlay | null = null;

export function mountDissolveOverlay(root: HTMLElement | null): void {
  if (!root) {
    dissolveOverlay = null;
    return;
  }
  const veil = root.querySelector<HTMLElement>("[data-transition-veil]");
  if (!veil) return;
  dissolveOverlay = { root, veil };
}

export function getDissolveOverlay(): DissolveOverlay | null {
  return dissolveOverlay;
}

export function prefersReducedMotion(): boolean {
  return (
    typeof window !== "undefined" &&
    window.matchMedia("(prefers-reduced-motion: reduce)").matches
  );
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

function requireDissolveOverlay(): DissolveOverlay {
  if (!dissolveOverlay) {
    throw new Error("Dissolve overlay is not mounted.");
  }
  return dissolveOverlay;
}

/** Fade current view out through a soft veil. */
export async function playDissolveLeave(target: HTMLElement | null): Promise<void> {
  if (prefersReducedMotion()) return;

  const { root, veil } = requireDissolveOverlay();
  gsap.set(root, { visibility: "visible", pointerEvents: "auto" });
  gsap.set(veil, { opacity: 0 });

  const timeline = gsap.timeline();

  if (target) {
    timeline.to(
      target,
      {
        opacity: 0,
        scale: 0.992,
        y: target.hasAttribute("data-dashboard-shell") ? -12 : -8,
        filter: "blur(10px)",
        duration: 0.34,
        ease: "power2.in",
      },
      0,
    );
  }

  timeline.to(
    veil,
    {
      opacity: 1,
      duration: 0.26,
      ease: "power2.inOut",
    },
    0.08,
  );

  await timeline;
}

/** Reveal the next view as the veil lifts. */
export async function playDissolveEnter(
  target: HTMLElement | null,
  revealSelector = "[data-page-reveal], [data-app-reveal]",
): Promise<void> {
  if (prefersReducedMotion()) return;

  const { root, veil } = requireDissolveOverlay();

  gsap.set(root, { visibility: "visible", pointerEvents: "auto" });
  gsap.set(veil, { opacity: 1 });

  if (target) {
    gsap.set(target, {
      opacity: 0,
      y: 14,
      scale: 0.996,
      filter: "blur(8px)",
    });
  }

  const revealItems = target?.querySelectorAll<HTMLElement>(revealSelector) ?? [];
  if (revealItems.length) {
    gsap.set(revealItems, { opacity: 0, y: 10 });
  }

  const timeline = gsap.timeline();

  timeline.to(
    veil,
    {
      opacity: 0,
      duration: 0.32,
      ease: "power2.inOut",
    },
    0,
  );

  if (target) {
    timeline.to(
      target,
      {
        opacity: 1,
        y: 0,
        scale: 1,
        filter: "blur(0px)",
        duration: 0.38,
        ease: "power2.out",
        clearProps: "filter",
      },
      0.06,
    );
  }

  if (revealItems.length) {
    timeline.to(
      revealItems,
      {
        opacity: 1,
        y: 0,
        duration: 0.32,
        stagger: 0.04,
        ease: "power2.out",
      },
      0.14,
    );
  }

  timeline.eventCallback("onComplete", () => {
    gsap.set(root, { visibility: "hidden", pointerEvents: "none" });
    gsap.set(veil, { clearProps: "opacity" });
    if (target) {
      gsap.set(target, { clearProps: "opacity,transform,filter" });
    }
    if (revealItems.length) {
      gsap.set(revealItems, { clearProps: "opacity,transform" });
    }
  });

  await timeline;
}
