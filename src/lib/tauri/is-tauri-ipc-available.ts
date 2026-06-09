import { isMacOsDesktopShell, isTauriDesktop } from "@/lib/tauri/is-tauri-desktop";

/** True when the Tauri IPC bridge is injected (local or remote shell). */
export function isTauriIpcAvailable(): boolean {
  if (typeof window === "undefined") return false;
  return "__TAURI_INTERNALS__" in window || "__TAURI__" in window;
}

/** macOS desktop shell with working Tauri IPC — required for native Sign in with Apple. */
export function canUseTauriNativeAppleSignIn(): boolean {
  return isTauriDesktop() && isMacOsDesktopShell() && isTauriIpcAvailable();
}
