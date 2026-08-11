/**
 * Keyboard shortcut label for the AI entry point.
 *
 * ⌘K and ⌘F belong to the command palette, ⌘B toggles the sidebar — ⌘J is the
 * free slot and matches the assistant convention users already know.
 */
export function assistantShortcutLabel(platform?: string): string {
  const value = platform ?? (typeof navigator === "undefined" ? "" : navigator.platform);
  const isApple = /mac|iphone|ipad|ipod/i.test(value);
  return isApple ? "⌘J" : "Ctrl J";
}
