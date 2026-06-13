import {
  playDissolveEnter,
  playDissolveLeave,
  prefersReducedMotion,
  resetDissolveVeil,
  waitForTransitionTarget,
} from "@/lib/motion/dissolve-transition";
import { isTauriDesktop } from "@/lib/tauri/is-tauri-desktop";

export const AUTH_SESSION_STORAGE_KEY = "autocore-auth-session";
export const AUTH_JOURNEY_HANDOFF_KEY = "autocore-auth-journey-handoff";

export type AuthSessionKind = "sign-in" | "sign-out";

let enterInFlight = false;

export function markAuthSessionTransition(kind: AuthSessionKind): void {
  sessionStorage.setItem(AUTH_SESSION_STORAGE_KEY, kind);
}

export function markAuthJourneyHandoff(): void {
  sessionStorage.setItem(AUTH_JOURNEY_HANDOFF_KEY, "1");
}

export function consumeAuthJourneyHandoff(): boolean {
  const value = sessionStorage.getItem(AUTH_JOURNEY_HANDOFF_KEY);
  sessionStorage.removeItem(AUTH_JOURNEY_HANDOFF_KEY);
  return value === "1";
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

function getLeaveTarget(kind: AuthSessionKind): HTMLElement | null {
  if (kind === "sign-out") {
    return (
      document.querySelector<HTMLElement>("[data-dashboard-shell]") ??
      document.querySelector<HTMLElement>('[data-barba="wrapper"]')
    );
  }

  return document.querySelector<HTMLElement>("[data-auth-journey-content]");
}

function getEnterSelector(kind: AuthSessionKind): string {
  return kind === "sign-in" ? "[data-auth-journey-shell]" : "[data-login-screen]";
}

export async function playAuthSessionLeave(kind: AuthSessionKind): Promise<void> {
  if (kind === "sign-in" && consumeAuthJourneyHandoff()) {
    return;
  }

  const target = getLeaveTarget(kind);
  await playDissolveLeave(target);
}

export async function playAuthSessionEnter(kind: AuthSessionKind): Promise<void> {
  if (enterInFlight) return;
  enterInFlight = true;

  try {
    if (shouldSkipAuthMotion()) {
      consumeAuthSessionTransition();
      resetDissolveVeil();
      return;
    }

    if (!peekAuthSessionTransition()) return;

    if (kind === "sign-in" && consumeAuthJourneyHandoff()) {
      await waitForTransitionTarget("[data-auth-journey-shell]", 2400);
      resetDissolveVeil();
      consumeAuthSessionTransition();
      return;
    }

    const selector = getEnterSelector(kind);
    const target = await waitForTransitionTarget(selector, 2400);

    if (kind === "sign-in" && target) {
      resetDissolveVeil();
      consumeAuthSessionTransition();
      return;
    }

    const revealSelector = kind === "sign-in" ? "[data-auth-journey-step]" : "[data-page-reveal]";
    await playDissolveEnter(target, revealSelector);
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
      sessionStorage.removeItem(AUTH_JOURNEY_HANDOFF_KEY);
      router[method]("/");
      return;
    }

    if (typeof window !== "undefined") {
      sessionStorage.setItem(APP_AUTH_NAV_LOCK, "1");
    }

    markAuthJourneyHandoff();
    markAuthSessionTransition("sign-in");
    router[method]("/");
  })();

  try {
    await authNavInFlight;
  } finally {
    authNavInFlight = null;
    if (typeof window !== "undefined") {
      window.setTimeout(() => sessionStorage.removeItem(APP_AUTH_NAV_LOCK), 800);
    }
  }
}
