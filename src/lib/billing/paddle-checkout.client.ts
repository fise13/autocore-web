import { getFirebaseAuth } from "@/infrastructure/firebase/client";
import { type PaddleBillingInterval } from "@/lib/paddle/prices";

type CreateCheckoutSessionParams = {
  interval: PaddleBillingInterval;
  companyId?: string;
  customerEmail?: string | null;
  successUrl?: string;
};

export async function createPaddleCheckoutSession({
  interval,
  companyId,
  customerEmail,
  successUrl,
}: CreateCheckoutSessionParams): Promise<string> {
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
  };

  if (companyId) {
    const user = getFirebaseAuth().currentUser;
    if (!user) {
      throw new Error("Sign in to upgrade your company plan");
    }
    headers.Authorization = `Bearer ${await user.getIdToken()}`;
  }

  const response = await fetch("/api/billing/paddle/checkout", {
    method: "POST",
    headers,
    body: JSON.stringify({
      interval,
      companyId,
      customerEmail,
      successUrl,
    }),
  });

  const payload = (await response.json().catch(() => null)) as {
    transactionId?: string;
    error?: string;
  } | null;

  if (!response.ok) {
    throw new Error(payload?.error ?? "Failed to start Paddle checkout");
  }

  const transactionId = payload?.transactionId?.trim();
  if (!transactionId) {
    throw new Error("Paddle did not return a transaction id");
  }

  return transactionId;
}
