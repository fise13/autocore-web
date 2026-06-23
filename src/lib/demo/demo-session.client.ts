import { getFirebaseAuth } from "@/infrastructure/firebase/client";

const DEMO_SESSION_KEY = "autocore-demo-session";
const DEMO_RESET_DONE_KEY = "autocore-demo-reset-done";
const DEMO_RESET_TIMEOUT_MS = 12_000;
const DEMO_TOKEN_REFRESH_MS = 4 * 60 * 1000;

let primedResetToken: string | null = null;
let resetInFlight: Promise<boolean> | null = null;
let tokenRefreshTimer: number | undefined;

export function markDemoSessionActive(): void {
  sessionStorage.setItem(DEMO_SESSION_KEY, "1");
  sessionStorage.removeItem(DEMO_RESET_DONE_KEY);
}

export function clearDemoSessionMarker(): void {
  sessionStorage.removeItem(DEMO_SESSION_KEY);
}

export function hasDemoSessionMarker(): boolean {
  return sessionStorage.getItem(DEMO_SESSION_KEY) === "1";
}

function markDemoResetDone(): void {
  sessionStorage.setItem(DEMO_RESET_DONE_KEY, "1");
}

function hasDemoResetDone(): boolean {
  return sessionStorage.getItem(DEMO_RESET_DONE_KEY) === "1";
}

export async function primeDemoResetToken(): Promise<void> {
  const auth = getFirebaseAuth();
  const user = auth.currentUser;
  if (!user) {
    primedResetToken = null;
    return;
  }

  primedResetToken = await user.getIdToken();
}

type DemoResetOptions = {
  keepalive?: boolean;
  timeoutMs?: number;
};

/** Resets shared demo workspace once per session (logout or tab close). */
export async function dispatchDemoReset(options?: DemoResetOptions): Promise<boolean> {
  if (hasDemoResetDone()) return true;
  if (resetInFlight) return resetInFlight;

  resetInFlight = (async () => {
    const auth = getFirebaseAuth();
    const user = auth.currentUser;

    let token = primedResetToken;
    if (!token && user) {
      token = await user.getIdToken();
    }
    if (!token) return false;

    const timeoutMs = options?.timeoutMs ?? DEMO_RESET_TIMEOUT_MS;
    const controller = options?.keepalive ? null : new AbortController();
    const timer =
      controller !== null ? window.setTimeout(() => controller.abort(), timeoutMs) : undefined;

    try {
      const response = await fetch("/api/demo/reset", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
        },
        signal: controller?.signal,
        keepalive: options?.keepalive ?? false,
      });

      if (!response.ok) {
        const body = (await response.json().catch(() => null)) as { error?: string } | null;
        throw new Error(body?.error ?? "Не удалось сбросить демо-данные");
      }

      markDemoResetDone();
      clearDemoSessionMarker();
      primedResetToken = null;
      return true;
    } catch (error) {
      if (error instanceof Error && error.name === "AbortError") {
        throw new Error("Сброс демо занял слишком много времени");
      }
      throw error;
    } finally {
      if (timer !== undefined) window.clearTimeout(timer);
    }
  })().finally(() => {
    resetInFlight = null;
  });

  return resetInFlight;
}

export async function resetDemoWorkspaceRemote(timeoutMs = DEMO_RESET_TIMEOUT_MS): Promise<void> {
  await dispatchDemoReset({ timeoutMs });
}

export function installDemoExitReset(): () => void {
  const refreshToken = () => {
    void primeDemoResetToken();
  };

  refreshToken();
  tokenRefreshTimer = window.setInterval(refreshToken, DEMO_TOKEN_REFRESH_MS);

  const onPageHide = () => {
    if (hasDemoResetDone() || resetInFlight) return;
    void dispatchDemoReset({ keepalive: true }).catch((error) => {
      console.warn("[demo] reset on page hide failed:", error);
    });
  };

  window.addEventListener("pagehide", onPageHide);

  return () => {
    window.removeEventListener("pagehide", onPageHide);
    if (tokenRefreshTimer !== undefined) {
      window.clearInterval(tokenRefreshTimer);
      tokenRefreshTimer = undefined;
    }
    primedResetToken = null;
  };
}
