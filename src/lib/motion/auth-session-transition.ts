import { gsap } from "gsap";

import {
  getCrossRouteOverlay,
  prefersReducedMotion,
  waitForTransitionTarget,
} from "@/lib/motion/cross-route-transition";
import { isTauriDesktop } from "@/lib/tauri/is-tauri-desktop";

export const AUTH_SESSION_STORAGE_KEY = "autocore-auth-session";

export type AuthSessionKind = "sign-in" | "sign-out";

let enterInFlight = false;

export function markAuthSessionTransition(kind: AuthSessionKind): void {
  sessionStorage.setItem(AUTH_SESSION_STORAGE_KEY, kind);
}

export function peekAuthSessionTransition(): AuthSessionKind | null {
  const value = sessionStorage.getItem(AUTH_SESSION_STORAGE_KEY);
  if (value === "sign-in" || value === "sign-out") return value;
  return null;
}

export function consumeAuthSessionTransition(): AuthSessionKind | null {
  const value = peekAuthSessionTransition();
  sessionStorage.removeItem(AUTH_SESSION_STORAGE_KEY);
  return value;
}

function requireOverlay() {
  const overlay = getCrossRouteOverlay();
  if (!overlay) {
    throw new Error("Auth session overlay is not mounted.");
  }
  return overlay;
}

function getLeaveTarget(kind: AuthSessionKind): HTMLElement | null {
  if (kind === "sign-out") {
    return (
      document.querySelector<HTMLElement>("[data-dashboard-shell]") ??
      document.querySelector<HTMLElement>('[data-barba="wrapper"]')
    );
  }

  return (
    document.querySelector<HTMLElement>('[data-barba="wrapper"]') ??
    document.querySelector<HTMLElement>("[data-login-screen]")
  );
}

function getEnterSelector(kind: AuthSessionKind): string {
  return kind === "sign-in" ? "[data-dashboard-shell]" : "[data-login-screen]";
}

export async function playAuthSessionLeave(kind: AuthSessionKind): Promise<void> {
  if (prefersReducedMotion()) return;

  const { root, panel, logo, accent } = requireOverlay();
  const target = getLeaveTarget(kind);

  gsap.set(root, { visibility: "visible", pointerEvents: "auto" });

  if (kind === "sign-in") {
    gsap.set(panel, { yPercent: 105, xPercent: 0, opacity: 1, scale: 1.02 });
    gsap.set(logo, { opacity: 0, scale: 0.72, y: 24 });
    gsap.set(accent, { scaleX: 0, transformOrigin: "50% 50%" });

    const timeline = gsap.timeline();

    if (target) {
      timeline.to(
        target,
        {
          opacity: 0.15,
          scale: 0.94,
          y: -36,
          filter: "blur(14px)",
          duration: 0.52,
          ease: "power3.in",
        },
        0,
      );
    }

    timeline.to(
      panel,
      {
        yPercent: 0,
        scale: 1,
        duration: 0.78,
        ease: "power4.inOut",
      },
      0.04,
    );

    timeline.to(
      accent,
      {
        scaleX: 1,
        duration: 0.56,
        ease: "power2.out",
      },
      0.2,
    );

    timeline.to(
      logo,
      {
        opacity: 1,
        scale: 1.06,
        y: 0,
        duration: 0.44,
        ease: "back.out(1.6)",
      },
      0.28,
    );

    timeline.to(
      logo,
      {
        scale: 1,
        duration: 0.28,
        ease: "power2.out",
      },
      0.62,
    );

    await timeline;
    return;
  }

  gsap.set(panel, { xPercent: -100, opacity: 1, yPercent: 0, scale: 1 });
  gsap.set(logo, { opacity: 0, scale: 0.88, y: 10 });
  gsap.set(accent, { scaleX: 0, transformOrigin: "0% 50%" });

  const timeline = gsap.timeline();

  if (target) {
    timeline.to(
      target,
      {
        opacity: 0.28,
        x: 48,
        scale: 0.982,
        filter: "blur(10px)",
        duration: 0.46,
        ease: "power2.in",
      },
      0,
    );
  }

  timeline.to(
    panel,
    {
      xPercent: 0,
      duration: 0.64,
      ease: "power3.inOut",
    },
    0.06,
  );

  timeline.to(
    accent,
    {
      scaleX: 1,
      duration: 0.44,
      ease: "power2.out",
    },
    0.16,
  );

  timeline.to(
    logo,
    {
      opacity: 1,
      scale: 1,
      y: 0,
      duration: 0.36,
      ease: "power3.out",
    },
    0.22,
  );

  await timeline;
}

export async function playAuthSessionEnter(kind: AuthSessionKind): Promise<void> {
  if (enterInFlight) return;
  enterInFlight = true;

  try {
    if (shouldSkipAuthMotion()) {
      consumeAuthSessionTransition();
      return;
    }

    if (!peekAuthSessionTransition()) return;

    const { root, panel, logo, accent } = requireOverlay();
    const target = await waitForTransitionTarget(getEnterSelector(kind));

    gsap.set(root, { visibility: "visible", pointerEvents: "auto" });

    if (kind === "sign-in") {
      gsap.set(panel, { yPercent: 0, xPercent: 0, opacity: 1, scale: 1 });
      gsap.set(logo, { opacity: 1, scale: 1, y: 0 });
      gsap.set(accent, { scaleX: 1, transformOrigin: "50% 50%" });

      if (target) {
        gsap.set(target, {
          opacity: 0,
          y: 40,
          scale: 0.968,
          filter: "blur(8px)",
        });
      }

      const revealItems = target?.querySelectorAll<HTMLElement>("[data-app-reveal]") ?? [];
      if (revealItems.length) {
        gsap.set(revealItems, { opacity: 0, y: 22 });
      }

      const timeline = gsap.timeline();

      timeline.to(
        logo,
        {
          opacity: 0,
          scale: 0.88,
          y: -16,
          duration: 0.26,
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
        0.04,
      );

      timeline.to(
        panel,
        {
          yPercent: -105,
          duration: 0.74,
          ease: "power4.inOut",
        },
        0.1,
      );

      if (target) {
        timeline.to(
          target,
          {
            opacity: 1,
            y: 0,
            scale: 1,
            filter: "blur(0px)",
            duration: 0.62,
            ease: "power3.out",
            clearProps: "filter",
          },
          0.26,
        );
      }

      if (revealItems.length) {
        timeline.to(
          revealItems,
          {
            opacity: 1,
            y: 0,
            duration: 0.48,
            stagger: 0.06,
            ease: "power2.out",
          },
          0.38,
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
      consumeAuthSessionTransition();
      return;
    }

    gsap.set(panel, { xPercent: 0, opacity: 1, yPercent: 0, scale: 1 });
    gsap.set(logo, { opacity: 1, scale: 1, y: 0 });
    gsap.set(accent, { scaleX: 1, transformOrigin: "100% 50%" });

    if (target) {
      gsap.set(target, {
        opacity: 0,
        y: 28,
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
        y: 10,
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
        xPercent: 100,
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
    consumeAuthSessionTransition();
  } finally {
    enterInFlight = false;
  }
}

type AppRouter = {
  push: (href: string) => void;
  replace: (href: string) => void;
};

const APP_AUTH_NAV_LOCK = "autocore-app-auth-nav";
let authNavInFlight: Promise<void> | null = null;

function shouldSkipAuthMotion(): boolean {
  return prefersReducedMotion() || isTauriDesktop();
}

export async function navigateToAppAfterAuth(
  router: AppRouter,
  method: "push" | "replace" = "replace",
): Promise<void> {
  if (authNavInFlight) {
    return authNavInFlight;
  }

  authNavInFlight = (async () => {
    if (shouldSkipAuthMotion()) {
      sessionStorage.removeItem(APP_AUTH_NAV_LOCK);
      sessionStorage.removeItem(AUTH_SESSION_STORAGE_KEY);
      router[method]("/");
      return;
    }

    if (typeof window !== "undefined") {
      sessionStorage.setItem(APP_AUTH_NAV_LOCK, "1");
    }

    try {
      await Promise.race([
        playAuthSessionLeave("sign-in"),
        new Promise<void>((resolve) => window.setTimeout(resolve, 2500)),
      ]);
    } catch {
      // Overlay may not be mounted during SSR or early bootstrap.
    }

    markAuthSessionTransition("sign-in");
    router[method]("/");
  })();

  try {
    await authNavInFlight;
  } finally {
    authNavInFlight = null;
    if (typeof window !== "undefined") {
      window.setTimeout(() => sessionStorage.removeItem(APP_AUTH_NAV_LOCK), 1500);
    }
  }
}
