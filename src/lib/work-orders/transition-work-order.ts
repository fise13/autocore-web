import { WorkOrderStatus } from "@/domain/work-order";
import { getFirebaseAuth } from "@/infrastructure/firebase/client";

type TransitionWorkOrderResponse = {
  order: {
    id: string;
    status: WorkOrderStatus;
  };
};

export async function transitionWorkOrder(
  workOrderId: string,
  status: WorkOrderStatus,
): Promise<TransitionWorkOrderResponse> {
  const auth = getFirebaseAuth();
  const user = auth.currentUser;
  if (!user) {
    throw new Error("Требуется авторизация");
  }

  const token = await user.getIdToken();
  const response = await fetch(`/api/work-orders/${encodeURIComponent(workOrderId)}/transition`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ status }),
  });

  if (!response.ok) {
    const payload = (await response.json().catch(() => null)) as { error?: string } | null;
    throw new Error(payload?.error ?? "Не удалось изменить статус заказа");
  }

  return (await response.json()) as TransitionWorkOrderResponse;
}
