import { gsap } from "gsap";

import type { BarbaCore, ITransitionData } from "@barba/core";

import { pathToBarbaNamespace } from "@/lib/barba/barba-navigation";

let initialized = false;
let barbaModule: BarbaCore | null = null;

async function getBarba(): Promise<BarbaCore> {
  if (barbaModule) return barbaModule;
  const mod = await import("@barba/core");
  barbaModule = mod.default;
  return barbaModule;
}

function prefersReducedMotion(): boolean {
  return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

function pageSchema(barba: BarbaCore, container: HTMLElement, href: string) {
  const url = new URL(href, window.location.origin);
  return {
    container,
    html: "",
    namespace: pathToBarbaNamespace(url.pathname),
    url: barba.url.parse(url.href),
  };
}

function buildTransitionData(barba: BarbaCore, container: HTMLElement, href: string): ITransitionData {
  const page = pageSchema(barba, container, href);
  return {
    current: page,
    next: page,
    trigger: "barba",
  };
}

export async function initBarbaRuntime(): Promise<BarbaCore> {
  const barba = await getBarba();
  if (initialized) return barba;
  initialized = true;

  barba.init({
    debug: process.env.NODE_ENV === "development",
    preventRunning: true,
    prevent: () => true,
    transitions: [
      {
        name: "marketing-fade",
        custom: (data) => data.current.namespace.startsWith("marketing-"),
        leave(data) {
          if (prefersReducedMotion()) return;
          return gsap.to(data.current.container, {
            opacity: 0,
            y: -10,
            duration: 0.15,
            ease: "power2.in",
          });
        },
        enter(data) {
          if (prefersReducedMotion()) {
            gsap.set(data.next.container, { clearProps: "opacity,transform" });
            return;
          }
          gsap.set(data.next.container, { opacity: 0, y: 12 });
          return gsap.to(data.next.container, {
            opacity: 1,
            y: 0,
            duration: 0.18,
            ease: "power2.out",
            clearProps: "transform",
          });
        },
      },
      {
        name: "app-crossfade",
        custom: (data) => data.current.namespace.startsWith("app-"),
        leave(data) {
          if (prefersReducedMotion()) return;
          return gsap.to(data.current.container, {
            opacity: 0,
            scale: 0.996,
            duration: 0.1,
            ease: "power1.in",
            transformOrigin: "50% 12%",
          });
        },
        enter(data) {
          if (prefersReducedMotion()) {
            gsap.set(data.next.container, { clearProps: "opacity,transform" });
            return;
          }
          gsap.set(data.next.container, { opacity: 0, scale: 0.998 });
          return gsap.to(data.next.container, {
            opacity: 1,
            scale: 1,
            duration: 0.12,
            ease: "power1.out",
            clearProps: "transform",
            transformOrigin: "50% 12%",
          });
        },
      },
    ],
  });

  barba.hooks.after(() => {
    window.scrollTo(0, 0);
  });

  if (history.scrollRestoration) {
    history.scrollRestoration = "manual";
  }

  return barba;
}

export async function runBarbaLeave(container: HTMLElement, href: string): Promise<void> {
  const barba = await initBarbaRuntime();
  const data = buildTransitionData(barba, container, href);
  const transition = barba.transitions.get(data);
  barba.transitions.isRunning = true;
  await barba.transitions.leave(data, transition);
}

export async function runBarbaEnter(container: HTMLElement, href: string): Promise<void> {
  const barba = await initBarbaRuntime();
  const data = buildTransitionData(barba, container, href);
  const transition = barba.transitions.get(data);
  try {
    await barba.transitions.enter(data, transition);
  } finally {
    barba.transitions.isRunning = false;
  }
}

/** Reset inline GSAP styles after instant cache navigation (leave may have set opacity: 0). */
export function resetBarbaContainerVisibility(container: HTMLElement | null): void {
  if (!container) return;
  gsap.set(container, { opacity: 1, scale: 1, y: 0, clearProps: "opacity,transform,filter" });
}
