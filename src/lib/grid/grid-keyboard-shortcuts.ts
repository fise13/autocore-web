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

/** Skip grid shortcuts when focus is in unrelated inputs (search, dialogs, etc.). */
export function isEditableExternalField(target: EventTarget | null): boolean {
  if (!(target instanceof HTMLElement)) return false;
  if (target.closest("[data-grid-root]")) return false;
  if (target.closest("[data-no-grid-undo]")) return true;
  const tag = target.tagName;
  return tag === "INPUT" || tag === "TEXTAREA" || target.isContentEditable;
}
