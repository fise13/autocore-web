const INTENT_KEY = "autocore-billing-intent";
const INTERVAL_KEY = "autocore-billing-intent-interval";

export type PendingBillingIntent =
  | { type: "trial" }
  | { type: "pro"; interval: "monthly" | "yearly" };

export function storePendingBillingIntent(intent: PendingBillingIntent) {
  if (typeof window === "undefined") return;
  sessionStorage.setItem(INTENT_KEY, intent.type);
  if (intent.type === "pro") {
    sessionStorage.setItem(INTERVAL_KEY, intent.interval);
  } else {
    sessionStorage.removeItem(INTERVAL_KEY);
  }
}

export function readPendingBillingIntent(): PendingBillingIntent | null {
  if (typeof window === "undefined") return null;
  const type = sessionStorage.getItem(INTENT_KEY);
  if (type === "trial") return { type: "trial" };
  if (type === "pro") {
    const interval = sessionStorage.getItem(INTERVAL_KEY);
    return { type: "pro", interval: interval === "yearly" ? "yearly" : "monthly" };
  }
  return null;
}

export function clearPendingBillingIntent() {
  if (typeof window === "undefined") return;
  sessionStorage.removeItem(INTENT_KEY);
  sessionStorage.removeItem(INTERVAL_KEY);
}

export function readBillingIntentFromSearchParams(searchParams: URLSearchParams): PendingBillingIntent | null {
  const billing = searchParams.get("billing");
  if (billing === "trial") return { type: "trial" };
  if (billing === "pro") {
    const interval = searchParams.get("interval");
    return { type: "pro", interval: interval === "yearly" ? "yearly" : "monthly" };
  }
  return null;
}
