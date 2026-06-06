"use client";

import { KeyboardEvent, useMemo } from "react";

type GridEditorOverlayProps = {
  value: string;
  editorKey: string;
  frame: { x: number; y: number; width: number; height: number };
  onChange: (value: string) => void;
  onCommit: (direction?: "down" | "up" | "left" | "right") => void;
  onCancel: () => void;
  autoFocus?: boolean;
  selectAll?: boolean;
  autocompleteMatch?: string | null;
};

export function GridEditorOverlay({
  value,
  editorKey,
  frame,
  onChange,
  onCommit,
  onCancel,
  autoFocus = true,
  selectAll = true,
  autocompleteMatch = null,
}: GridEditorOverlayProps) {
  const autocompleteSuffix = useMemo(() => {
    if (!autocompleteMatch) return "";
    if (!autocompleteMatch.toLowerCase().startsWith(value.toLowerCase())) return "";
    return autocompleteMatch.slice(value.length);
  }, [autocompleteMatch, value]);

  function handleKeyDown(event: KeyboardEvent<HTMLTextAreaElement>) {
    if (event.key === "Escape") {
      event.preventDefault();
      onCancel();
      return;
    }

    if (event.key === "Delete" || event.key === "Backspace") {
      if (
        event.currentTarget.value.length === 0 ||
        (event.currentTarget.selectionStart === 0 &&
          event.currentTarget.selectionEnd === event.currentTarget.value.length)
      ) {
        event.preventDefault();
        onChange("");
        onCommit();
        return;
      }
    }

    if (event.key === "Tab") {
      event.preventDefault();
      if (autocompleteSuffix) {
        onChange(value + autocompleteSuffix);
        return;
      }
      onCommit(event.shiftKey ? "left" : "right");
      return;
    }

    if (event.key === "Enter" && !event.altKey) {
      event.preventDefault();
      if (autocompleteSuffix) {
        onChange(value + autocompleteSuffix);
        return;
      }
      onCommit(event.shiftKey ? "up" : "down");
      return;
    }

    if (event.key === "ArrowRight" && autocompleteSuffix) {
      const target = event.currentTarget;
      if (target.selectionStart === value.length && target.selectionEnd === value.length) {
        event.preventDefault();
        onChange(value + autocompleteSuffix);
      }
    }
  }

  return (
    <div
      className="absolute z-30 overflow-hidden rounded-[2px] border-2 bg-card shadow-sm animate-autocore-fade-in origin-top-left motion-reduce:animate-none"
      style={{
        left: frame.x,
        top: frame.y,
        width: frame.width + 1,
        height: frame.height + 1,
        borderColor: "rgb(22, 163, 74)",
        animationDuration: "180ms",
      }}
    >
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 overflow-hidden px-2 py-1 text-[13px] leading-5 whitespace-pre-wrap break-words"
      >
        <span className="invisible">{value}</span>
        {autocompleteSuffix ? (
          <span className="text-muted-foreground/45">{autocompleteSuffix}</span>
        ) : null}
      </div>
      <textarea
        key={editorKey}
        autoFocus={autoFocus}
        value={value}
        onMouseDown={(event) => event.stopPropagation()}
        onFocus={(event) => {
          if (selectAll) {
            event.currentTarget.select();
            return;
          }
          const cursor = event.currentTarget.value.length;
          event.currentTarget.setSelectionRange(cursor, cursor);
        }}
        onChange={(event) => onChange(event.target.value)}
        onBlur={() => onCommit()}
        onKeyDown={handleKeyDown}
        className="relative h-full w-full resize-none bg-transparent px-2 py-1 text-[13px] leading-5 text-foreground outline-none"
        style={{ minHeight: frame.height + 1 }}
      />
    </div>
  );
}
