import { getFirebaseAuth } from "@/infrastructure/firebase/client";

export async function ensureWorkOrderDocuments(workOrderId: string): Promise<void> {
  const auth = getFirebaseAuth();
  const user = auth.currentUser;
  if (!user) return;

  const token = await user.getIdToken();
  await fetch(`/api/work-orders/${encodeURIComponent(workOrderId)}/ensure-documents`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
  }).catch(() => undefined);
}
