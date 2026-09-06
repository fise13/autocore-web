function isApplePlatform(platform?: string): boolean {
  const value = platform ?? (typeof navigator === "undefined" ? "" : navigator.platform);
  return /mac|iphone|ipad|ipod/i.test(value);
}

/**
 * Shortcut that opens Core from the rest of AutoCore.
 *
 * ⌘K is the in-Core command focus (and the app command palette off `/ai`).
 * ⌘J remains the global enter/leave for the Core workspace.
 */
export function assistantShortcutLabel(platform?: string): string {
  return isApplePlatform(platform) ? "⌘J" : "Ctrl J";
}

/** Shortcut shown on the Core composer — focuses the command rail. */
export function coreComposerShortcutLabel(platform?: string): string {
  return isApplePlatform(platform) ? "⌘K" : "Ctrl K";
}
