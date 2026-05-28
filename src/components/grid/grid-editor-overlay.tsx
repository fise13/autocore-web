"use client";

import { KeyboardEvent } from "react";

type GridEditorOverlayProps = {
  value: string;
  editorKey: string;
  frame: { x: number; y: number; width: number; height: number };
  onChange: (value: string) => void;
  onCommit: (direction?: "down" | "up" | "left" | "right") => void;
  onCancel: () => void;
  autoFocus?: boolean;
  selectAll?: boolean;
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
}: GridEditorOverlayProps) {
  function handleKeyDown(event: KeyboardEvent<HTMLTextAreaElement>) {
    if (event.key === "Escape") {
      event.preventDefault();
      onCancel();
      return;
    }
    if (event.key === "Delete" || event.key === "Backspace") {
      if (event.currentTarget.value.length === 0 || (event.currentTarget.selectionStart === 0 && event.currentTarget.selectionEnd === event.currentTarget.value.length)) {
        event.preventDefault();
        onChange("");
        onCommit();
        return;
      }
    }
    if (event.key === "Enter" && !event.altKey) {
      event.preventDefault();
      onCommit(event.shiftKey ? "up" : "down");
      return;
    }
    if (event.key === "Tab") {
      event.preventDefault();
      onCommit(event.shiftKey ? "left" : "right");
    }
  }

  return (
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
      className="absolute z-30 resize-none rounded-[2px] border-2 bg-white px-2 py-1 text-[13px] leading-5 text-foreground shadow-sm outline-none animate-autocore-fade-in origin-top-left motion-reduce:animate-none"
      style={{
        left: frame.x,
        top: frame.y,
        width: frame.width + 1,
        height: frame.height + 1,
        borderColor: "rgb(22, 163, 74)",
        animationDuration: "180ms",
        transform: "scale(1)",
      }}
    />
  );
}
