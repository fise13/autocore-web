import { getFirebaseAuth } from "@/infrastructure/firebase/client";

export async function notifyWorkOrderAvailable(workOrderId: string): Promise<void> {
  const auth = getFirebaseAuth();
  const user = auth.currentUser;
  if (!user) return;

  const token = await user.getIdToken();
  const response = await fetch(`/api/work-orders/${encodeURIComponent(workOrderId)}/notify-available`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
  });

  if (!response.ok) {
    const payload = (await response.json().catch(() => null)) as { error?: string } | null;
    throw new Error(payload?.error ?? "Не удалось отправить уведомление о наряде");
  }
}
