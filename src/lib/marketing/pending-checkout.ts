const SESSION_KEY = "autocore-marketing-checkout-session";
const INTERVAL_KEY = "autocore-marketing-checkout-interval";

export type PendingMarketingCheckout = {
  sessionId: string;
  interval: "monthly" | "yearly";
};

export function storePendingMarketingCheckout(payload: PendingMarketingCheckout) {
  if (typeof window === "undefined") return;
  sessionStorage.setItem(SESSION_KEY, payload.sessionId);
  sessionStorage.setItem(INTERVAL_KEY, payload.interval);
}

export function readPendingMarketingCheckout(): PendingMarketingCheckout | null {
  if (typeof window === "undefined") return null;
  const sessionId = sessionStorage.getItem(SESSION_KEY)?.trim();
  if (!sessionId) return null;
  const interval = sessionStorage.getItem(INTERVAL_KEY);
  return {
    sessionId,
    interval: interval === "yearly" ? "yearly" : "monthly",
  };
}

export function clearPendingMarketingCheckout() {
  if (typeof window === "undefined") return;
  sessionStorage.removeItem(SESSION_KEY);
  sessionStorage.removeItem(INTERVAL_KEY);
}
