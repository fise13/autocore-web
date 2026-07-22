"use client";

import {
  ClipboardCopy,
  ClipboardPaste,
  ExternalLink,
  Link2,
  RefreshCw,
  Scissors,
  type LucideIcon,
} from "lucide-react";

export type AppContextMenuAction = {
  id: string;
  label: string;
  icon?: LucideIcon;
  shortcut?: string;
  destructive?: boolean;
  disabled?: boolean;
  separatorBefore?: boolean;
  run: () => void | Promise<void>;
};

function isTextField(el: Element): el is HTMLInputElement | HTMLTextAreaElement {
  return el instanceof HTMLInputElement || el instanceof HTMLTextAreaElement;
}

function isEditableTarget(el: Element): boolean {
  if (el instanceof HTMLElement && el.isContentEditable) return true;
  if (!isTextField(el)) return false;
  if (el instanceof HTMLInputElement) {
    const type = el.type;
    return (
      type === "text" ||
      type === "search" ||
      type === "url" ||
      type === "tel" ||
      type === "password" ||
      type === "email" ||
      type === "number" ||
      type === ""
    );
  }
  return true;
}

async function writeClipboard(text: string) {
  try {
    await navigator.clipboard.writeText(text);
  } catch {
    // ignore permission errors
  }
}

async function readClipboard(): Promise<string> {
  try {
    return await navigator.clipboard.readText();
  } catch {
    return "";
  }
}

function selectedText(): string {
  return window.getSelection()?.toString() ?? "";
}

function sameOriginPath(href: string): string | null {
  try {
    const url = new URL(href, window.location.href);
    if (url.origin !== window.location.origin) return null;
    return `${url.pathname}${url.search}${url.hash}`;
  } catch {
    return null;
  }
}

export function resolveAppContextMenuActions(
  target: EventTarget | null,
  navigate: (href: string) => void,
): AppContextMenuAction[] {
  if (!(target instanceof Element)) {
    return [
      {
        id: "reload",
        label: "Обновить",
        icon: RefreshCw,
        run: () => window.location.reload(),
      },
    ];
  }

  const actions: AppContextMenuAction[] = [];
  const anchor = target.closest("a[href]");
  const image = target.closest("img");
  const editable = target.closest("input, textarea, [contenteditable='true']");

  if (anchor instanceof HTMLAnchorElement && anchor.getAttribute("href")) {
    const href = anchor.href;
    const internal = sameOriginPath(href);
    actions.push(
      {
        id: "open",
        label: "Открыть",
        icon: ExternalLink,
        run: () => {
          if (internal) navigate(internal);
          else window.location.assign(href);
        },
      },
      {
        id: "open-tab",
        label: "Открыть в новой вкладке",
        icon: ExternalLink,
        run: () => {
          window.open(href, "_blank", "noopener,noreferrer");
        },
      },
      {
        id: "copy-link",
        label: "Копировать ссылку",
        icon: Link2,
        run: () => void writeClipboard(href),
      },
    );
  }

  if (image instanceof HTMLImageElement && image.currentSrc) {
    if (actions.length) actions[actions.length - 1]!.separatorBefore = false;
    const src = image.currentSrc;
    actions.push(
      {
        id: "open-image",
        label: "Открыть изображение",
        icon: ExternalLink,
        separatorBefore: actions.length > 0,
        run: () => {
          window.open(src, "_blank", "noopener,noreferrer");
        },
      },
      {
        id: "copy-image-url",
        label: "Копировать адрес изображения",
        icon: Link2,
        run: () => void writeClipboard(src),
      },
    );
  }

  if (editable instanceof HTMLElement && isEditableTarget(editable)) {
    const field = editable;
    const text = selectedText();
    actions.push(
      {
        id: "cut",
        label: "Вырезать",
        icon: Scissors,
        shortcut: "⌘X",
        separatorBefore: actions.length > 0,
        disabled: !text,
        run: () => {
          if (!text) return;
          void writeClipboard(text);
          document.execCommand("cut");
        },
      },
      {
        id: "copy",
        label: "Копировать",
        icon: ClipboardCopy,
        shortcut: "⌘C",
        disabled: !text && !(isTextField(field) && field.value),
        run: () => {
          const value = text || (isTextField(field) ? field.value : "");
          if (value) void writeClipboard(value);
        },
      },
      {
        id: "paste",
        label: "Вставить",
        icon: ClipboardPaste,
        shortcut: "⌘V",
        run: async () => {
          const value = await readClipboard();
          if (!value) return;
          field.focus();
          if (!document.execCommand("insertText", false, value) && isTextField(field)) {
            const start = field.selectionStart ?? field.value.length;
            const end = field.selectionEnd ?? field.value.length;
            field.value = `${field.value.slice(0, start)}${value}${field.value.slice(end)}`;
            const cursor = start + value.length;
            field.setSelectionRange(cursor, cursor);
            field.dispatchEvent(new Event("input", { bubbles: true }));
          }
        },
      },
    );
    return actions;
  }

  const selection = selectedText().trim();
  if (selection) {
    actions.push({
      id: "copy-selection",
      label: "Копировать",
      icon: ClipboardCopy,
      shortcut: "⌘C",
      separatorBefore: actions.length > 0,
      run: () => void writeClipboard(selection),
    });
  }

  if (actions.length === 0) {
    actions.push({
      id: "reload",
      label: "Обновить",
      icon: RefreshCw,
      run: () => window.location.reload(),
    });
  }

  return actions;
}
