export function isUndoShortcut(event: {
  metaKey: boolean;
  ctrlKey: boolean;
  key: string;
  shiftKey: boolean;
}): boolean {
  const lower = event.key.toLowerCase();
  return (event.metaKey || event.ctrlKey) && lower === "z" && !event.shiftKey;
}

export function isRedoShortcut(event: {
  metaKey: boolean;
  ctrlKey: boolean;
  key: string;
  shiftKey: boolean;
}): boolean {
  const lower = event.key.toLowerCase();
  return (
    ((event.metaKey || event.ctrlKey) && lower === "z" && event.shiftKey) ||
    (event.ctrlKey && lower === "y")
  );
}

/** Cmd/Ctrl+F — workspace search (handled outside the grid). */
export function isFindShortcut(event: {
  metaKey: boolean;
  ctrlKey: boolean;
  key: string;
  shiftKey: boolean;
  altKey: boolean;
}): boolean {
  if (event.shiftKey || event.altKey) return false;
  return (event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "f";
}

/** Cmd/Ctrl+D — fill down. */
export function isFillDownShortcut(event: {
  metaKey: boolean;
  ctrlKey: boolean;
  key: string;
  shiftKey: boolean;
  altKey: boolean;
}): boolean {
  if (event.shiftKey || event.altKey) return false;
  return (event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "d";
}

/** Cmd/Ctrl+R — fill right. */
export function isFillRightShortcut(event: {
  metaKey: boolean;
  ctrlKey: boolean;
  key: string;
  shiftKey: boolean;
  altKey: boolean;
}): boolean {
  if (event.shiftKey || event.altKey) return false;
  return (event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "r";
}

/** Cmd/Ctrl+Enter — fill selection with active cell. */
export function isFillWithActiveShortcut(event: {
  metaKey: boolean;
  ctrlKey: boolean;
  key: string;
  shiftKey: boolean;
  altKey: boolean;
}): boolean {
  if (event.shiftKey || event.altKey) return false;
  return (event.metaKey || event.ctrlKey) && event.key === "Enter";
}

/** Skip grid shortcuts when focus is in unrelated inputs (search, dialogs, etc.). */
export function isEditableExternalField(target: EventTarget | null): boolean {
  if (!(target instanceof HTMLElement)) return false;
  if (target.closest("[data-grid-root]")) return false;
  if (target.closest("[data-no-grid-undo]")) return true;
  const tag = target.tagName;
  return tag === "INPUT" || tag === "TEXTAREA" || target.isContentEditable;
}

export function isApplePlatform(): boolean {
  if (typeof navigator === "undefined") return false;
  const platform = navigator.platform || "";
  const ua = navigator.userAgent || "";
  return /Mac|iPhone|iPad|iPod/i.test(platform) || /Mac OS X/i.test(ua);
}

/** Platform-aware shortcut label for context menus (e.g. ⌘C / Ctrl+C). */
export function modShortcutLabel(key: string): string {
  return isApplePlatform() ? `⌘${key}` : `Ctrl+${key}`;
}

export function deleteShortcutLabel(): string {
  return isApplePlatform() ? "⌫" : "Del";
}
