import { hasNativeBridge } from "@/platform/platform-target";

/** Menu items the shell forwards instead of handling itself. */
export type DesktopMenuAction = "save" | "print" | "settings" | "check-updates";

export type DesktopDeepLink = {
  /** Absolute product URL the link resolved to. */
  url: string;
  /** Path and query only, ready for the Next.js router. */
  path: string;
};

const MENU_EVENT = "autocore:menu";
const DEEP_LINK_EVENT = "autocore:deep-link";

const MENU_ACTIONS = new Set<string>(["save", "print", "settings", "check-updates"]);

function isMenuAction(value: unknown): value is DesktopMenuAction {
  return typeof value === "string" && MENU_ACTIONS.has(value);
}

/**
 * Subscribe to native menu actions (⌘S, ⌘P, ⌘,).
 *
 * The shell has no idea what is on screen, so it asks rather than acts. Returns
 * a cleanup function; a no-op on web.
 */
export function onDesktopMenuAction(handler: (action: DesktopMenuAction) => void): () => void {
  if (!hasNativeBridge()) return () => {};

  let unlisten: (() => void) | null = null;
  let cancelled = false;

  void (async () => {
    try {
      const { listenNative } = await import("@/platform/desktop/bridge");
      const stop = await listenNative<{ action?: unknown }>(MENU_EVENT, (payload) => {
        if (isMenuAction(payload?.action)) handler(payload.action);
      });
      if (cancelled) stop();
      else unlisten = stop;
    } catch {
      // No menu integration available; the app still works from its own UI.
    }
  })();

  return () => {
    cancelled = true;
    unlisten?.();
  };
}

/** Subscribe to `autocore://` deep links delivered while the app is running. */
export function onDesktopDeepLink(handler: (link: DesktopDeepLink) => void): () => void {
  if (!hasNativeBridge()) return () => {};

  let unlisten: (() => void) | null = null;
  let cancelled = false;

  void (async () => {
    try {
      const { listenNative } = await import("@/platform/desktop/bridge");
      const stop = await listenNative<Partial<DesktopDeepLink>>(DEEP_LINK_EVENT, (payload) => {
        if (typeof payload?.url === "string" && typeof payload?.path === "string") {
          handler({ url: payload.url, path: payload.path });
        }
      });
      if (cancelled) stop();
      else unlisten = stop;
    } catch {
      // Deep links still navigate the window from the Rust side.
    }
  })();

  return () => {
    cancelled = true;
    unlisten?.();
  };
}
