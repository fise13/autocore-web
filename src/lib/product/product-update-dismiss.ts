const DISMISSED_KEY = "autocore.product-updates.dismissed";

const dismissedInMemory = new Set<string>();

function readDismissedIds(): Set<string> {
  if (typeof window === "undefined") return new Set();
  try {
    const raw = window.localStorage.getItem(DISMISSED_KEY);
    if (!raw) return new Set();
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) return new Set();
    return new Set(parsed.filter((item): item is string => typeof item === "string"));
  } catch {
    return new Set();
  }
}

function writeDismissedIds(ids: Set<string>) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(DISMISSED_KEY, JSON.stringify([...ids].slice(-20)));
}

export function isProductUpdateDismissed(updateId: string): boolean {
  return dismissedInMemory.has(updateId) || readDismissedIds().has(updateId);
}

export function dismissProductUpdate(updateId: string) {
  dismissedInMemory.add(updateId);
  const ids = readDismissedIds();
  ids.add(updateId);
  writeDismissedIds(ids);
}
