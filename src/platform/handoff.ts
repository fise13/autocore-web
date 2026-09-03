import { hasNativeBridge } from "@/platform/platform-target";

/**
 * Advertise the current workspace URL as an Apple Handoff activity.
 *
 * No-op on web and on Windows/Linux shells. The native side ignores
 * `/login`, `/auth/*` and `?mode=browser` rather than throwing.
 */
export function publishDesktopHandoffUrl(url: string | null): void {
  if (!hasNativeBridge()) return;

  void (async () => {
    try {
      const { invokeNative } = await import("@/platform/desktop/bridge");
      await invokeNative("desktop_handoff_set_url", { url: url ?? null });
    } catch {
      // Handoff is additive. A stale shell without the command still works.
    }
  })();
}
