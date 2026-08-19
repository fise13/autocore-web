import { hasNativeBridge } from "@/platform/platform-target";

/**
 * Send a URL to the user's own browser.
 *
 * Support pages, docs, payment and legal links have no business rendering inside
 * the app window: the user's session, extensions and password manager live in
 * their browser. The shell also blocks these navigations itself as defence in
 * depth (see `src-tauri/src/window.rs`), but routing them here means the app
 * asks for the right thing rather than relying on being corrected.
 */
export async function openExternalUrl(url: string): Promise<void> {
  if (hasNativeBridge()) {
    try {
      const { openUrlNative } = await import("@/platform/desktop/bridge");
      await openUrlNative(url);
      return;
    } catch {
      // Fall through to the browser behaviour below.
    }
  }

  window.open(url, "_blank", "noopener,noreferrer");
}

/**
 * Open another view of the app itself — a document preview, a second work order.
 *
 * On web this is a new tab. On desktop the shell turns it into a real second
 * window, which is why it must not go through {@link openExternalUrl}: that
 * would eject the user into their browser and lose the desktop session.
 */
export function openAppUrl(url: string): void {
  window.open(url, "_blank", "noopener,noreferrer");
}
