/** True when running inside the Tauri desktop shell (macOS / Windows). */
export function isTauriDesktop(): boolean {
  if (typeof window === "undefined") return false;
  return "__TAURI_INTERNALS__" in window || "__TAURI__" in window;
}
