/** Dispatched when Core should put the caret in the command composer (⌘K). */
export const CORE_FOCUS_EVENT = "autocore:core-focus";

export function requestCoreFocus(): void {
  if (typeof window === "undefined") return;
  window.dispatchEvent(new Event(CORE_FOCUS_EVENT));
}

export function subscribeCoreFocus(handler: () => void): () => void {
  window.addEventListener(CORE_FOCUS_EVENT, handler);
  return () => window.removeEventListener(CORE_FOCUS_EVENT, handler);
}
