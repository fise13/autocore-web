import { getFirebaseAuth } from "@/infrastructure/firebase/client";

export type ProcessWorkOrderEventsResponse = {
  processed: number;
  failed: number;
  jobId?: string;
  documentSlugs: string[];
};

export async function triggerWorkOrderEventProcessing(
  workOrderId: string,
): Promise<ProcessWorkOrderEventsResponse> {
  const auth = getFirebaseAuth();
  const user = auth.currentUser;
  if (!user) {
    throw new Error("Требуется авторизация");
  }

  const token = await user.getIdToken();
  const response = await fetch(`/api/work-orders/${encodeURIComponent(workOrderId)}/process-events`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
  });

  if (!response.ok) {
    const payload = (await response.json().catch(() => null)) as { error?: string } | null;
    throw new Error(payload?.error ?? "Не удалось обработать события заказа");
  }

  return (await response.json()) as ProcessWorkOrderEventsResponse;
}
