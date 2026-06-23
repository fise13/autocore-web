import { getFirebaseAuth } from "@/infrastructure/firebase/client";

const DEMO_RESET_TIMEOUT_MS = 8_000;

export async function resetDemoWorkspaceRemote(timeoutMs = DEMO_RESET_TIMEOUT_MS): Promise<void> {
  const auth = getFirebaseAuth();
  const user = auth.currentUser;
  if (!user) return;

  const token = await user.getIdToken();
  const controller = new AbortController();
  const timer = window.setTimeout(() => controller.abort(), timeoutMs);

  try {
    const response = await fetch("/api/demo/reset", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
      },
      signal: controller.signal,
    });

    if (!response.ok) {
      const body = (await response.json().catch(() => null)) as { error?: string } | null;
      throw new Error(body?.error ?? "Не удалось сбросить демо-данные");
    }
  } catch (error) {
    if (error instanceof Error && error.name === "AbortError") {
      throw new Error("Сброс демо занял слишком много времени");
    }
    throw error;
  } finally {
    window.clearTimeout(timer);
  }
}

export function clearDemoSessionMarker(): void {
  sessionStorage.removeItem("autocore-demo-session");
}

export function hasDemoSessionMarker(): boolean {
  return sessionStorage.getItem("autocore-demo-session") === "1";
}
