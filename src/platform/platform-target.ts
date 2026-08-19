import { isTauriDesktop } from "@/lib/tauri/is-tauri-desktop";
import { isTauriIpcAvailable } from "@/lib/tauri/is-tauri-ipc-available";

export type PlatformTarget = "web" | "desktop";

/**
 * Looks like the desktop app — useful for copy and affordances ("Save to…"
 * rather than "Download"). True from the user agent or the `?desktop=1` marker,
 * so it is available before the Tauri bridge has attached.
 */
export function isDesktopShell(): boolean {
  return isTauriDesktop();
}

/**
 * The Tauri IPC bridge is actually reachable, so native commands can be called.
 *
 * Deliberately stricter than {@link isDesktopShell}: an older shell build, or a
 * window the capabilities do not cover, still reports as desktop but cannot
 * invoke anything. Every capability in this directory degrades to its web
 * implementation when this is false, so a stale desktop build loses native
 * polish instead of losing the feature.
 */
export function hasNativeBridge(): boolean {
  return isTauriIpcAvailable();
}

export function getPlatformTarget(): PlatformTarget {
  return hasNativeBridge() ? "desktop" : "web";
}
