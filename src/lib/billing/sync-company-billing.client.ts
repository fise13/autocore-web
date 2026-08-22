import { getFirebaseAuth } from "@/infrastructure/firebase/client";
import { syncCompanyBilling as syncStripeCompanyBilling } from "@/infrastructure/stripe/billing-service";
import { isPaddleCheckoutConfigured } from "@/lib/paddle/config";

async function readAuthToken(): Promise<string> {
  const user = getFirebaseAuth().currentUser;
  if (!user) {
    throw new Error("Войдите в аккаунт");
  }
  return user.getIdToken();
}

async function postBilling<T>(path: string, body: Record<string, unknown>): Promise<T> {
  const token = await readAuthToken();
  const response = await fetch(path, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
  });

  const payload = (await response.json().catch(() => null)) as (T & { error?: string }) | null;
  if (!response.ok) {
    throw new Error(payload?.error ?? "Не удалось обновить подписку");
  }
  return payload as T;
}

export async function openPaddlePortalRemote(companyId: string): Promise<string> {
  const result = await postBilling<{ url: string }>("/api/billing/paddle/portal", { companyId });
  const url = result.url?.trim();
  if (!url) {
    throw new Error("Paddle Portal не вернул ссылку");
  }
  return url;
}

export async function syncPaddleCompanyBillingRemote(
  companyId: string,
  transactionId?: string,
): Promise<boolean> {
  const result = await postBilling<{ proActive: boolean }>("/api/billing/paddle/sync", {
    companyId,
    ...(transactionId ? { transactionId } : {}),
  });
  return Boolean(result.proActive);
}

export async function syncCompanyBillingState(
  companyId: string,
  sessionId?: string,
  transactionId?: string,
): Promise<boolean> {
  if (isPaddleCheckoutConfigured()) {
    try {
      const active = await syncPaddleCompanyBillingRemote(companyId, transactionId);
      if (active) return true;
    } catch (error) {
      console.warn("Paddle billing sync skipped:", error);
    }
  }

  return syncStripeCompanyBilling(companyId, sessionId);
}
