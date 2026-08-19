import type { DesktopMenuAction } from "@/platform/desktop-events";

/**
 * Screen-local handlers for menu actions the shell cannot resolve on its own.
 *
 * ⌘S means "save this document" on a document preview and nothing at all on a
 * stock grid. Rather than teach the shell about screens, the screen that can
 * service an action registers for it while it is mounted, and the menu is a
 * no-op everywhere else — which is the honest behaviour.
 */
export type DesktopActionId = Extract<DesktopMenuAction, "save" | "print">;

type Handler = () => void | Promise<void>;

const handlers = new Map<DesktopActionId, Handler>();

/** Register while mounted. Returns the unregister function. */
export function registerDesktopAction(action: DesktopActionId, handler: Handler): () => void {
  handlers.set(action, handler);
  return () => {
    if (handlers.get(action) === handler) handlers.delete(action);
  };
}

/** Run a registered handler. Returns false when nothing claimed the action. */
export function runDesktopAction(action: DesktopActionId): boolean {
  const handler = handlers.get(action);
  if (!handler) return false;
  void handler();
  return true;
}
