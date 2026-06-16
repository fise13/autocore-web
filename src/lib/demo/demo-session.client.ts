import { getFirebaseAuth } from "@/infrastructure/firebase/client";

export async function resetDemoWorkspaceRemote(): Promise<void> {
  const auth = getFirebaseAuth();
  const user = auth.currentUser;
  if (!user) return;

  const token = await user.getIdToken();
  const response = await fetch("/api/demo/reset", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });

  if (!response.ok) {
    const body = (await response.json().catch(() => null)) as { error?: string } | null;
    throw new Error(body?.error ?? "Не удалось сбросить демо-данные");
  }
}

export function clearDemoSessionMarker(): void {
  sessionStorage.removeItem("autocore-demo-session");
}

export function hasDemoSessionMarker(): boolean {
  return sessionStorage.getItem("autocore-demo-session") === "1";
}
