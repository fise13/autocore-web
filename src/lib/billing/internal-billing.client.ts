import { BillingInterval } from "@/domain/billing";
import { getFirebaseAuth } from "@/infrastructure/firebase/client";

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

export async function startCompanyTrialRemote(companyId: string): Promise<{ proActive: boolean; started: boolean }> {
  return postBilling("/api/billing/start-trial", { companyId });
}

export async function activateInternalProRemote(
  companyId: string,
  interval: BillingInterval,
): Promise<{ proActive: boolean }> {
  return postBilling("/api/billing/activate-pro", { companyId, interval });
}

export type RefreshBillingRemoteResult = {
  proActive: boolean;
  expired?: "trial" | "pro";
};

export async function refreshCompanyBillingRemote(companyId: string): Promise<RefreshBillingRemoteResult> {
  return postBilling("/api/billing/refresh", { companyId });
}
