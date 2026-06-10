import {
  playDissolveEnter,
  playDissolveLeave,
  prefersReducedMotion,
  waitForTransitionTarget,
} from "@/lib/motion/dissolve-transition";
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
  const target = getLeaveTarget(kind);
  await playDissolveLeave(target);
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

    const selector = getEnterSelector(kind);
    const target = await waitForTransitionTarget(selector, 700);
    const revealSelector = kind === "sign-in" ? "[data-app-reveal]" : "[data-page-reveal]";

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
      router[method]("/");
      return;
    }

    if (typeof window !== "undefined") {
      sessionStorage.setItem(APP_AUTH_NAV_LOCK, "1");
    }

    try {
      await Promise.race([
        playAuthSessionLeave("sign-in"),
        new Promise<void>((resolve) => window.setTimeout(resolve, 320)),
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
      window.setTimeout(() => sessionStorage.removeItem(APP_AUTH_NAV_LOCK), 800);
    }
  }
}
