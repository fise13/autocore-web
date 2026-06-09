/** True when running inside the Tauri desktop shell (macOS / Windows). */
export function isTauriDesktop(): boolean {
  if (typeof window === "undefined") return false;

  if (/AutoCoreDesktop\//i.test(navigator.userAgent)) {
    return true;
  }

  if (window.location.search.includes("desktop=1")) {
    return true;
  }

  return "__TAURI_INTERNALS__" in window || "__TAURI__" in window;
}

export function isMacOsDesktopShell(): boolean {
  if (typeof navigator === "undefined") return false;
  return /Macintosh|Mac OS X/i.test(navigator.userAgent) && !/iPhone|iPad|iPod/i.test(navigator.userAgent);
}

export function isWindowsDesktopShell(): boolean {
  if (typeof navigator === "undefined") return false;
  return /Windows/i.test(navigator.userAgent);
}
