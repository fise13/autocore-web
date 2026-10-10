"use client";

import { useEffect, useRef, useState, type FormEvent, type KeyboardEvent } from "react";
import { createPortal } from "react-dom";

import { useAssistant } from "@/components/ai/ai-provider";
import { useCoreChat } from "@/components/ai/core-chat-runtime";
import { userCopy } from "@/lib/user-copy";

/**
 * Compact Ask Core overlay from the rest of AutoCore.
 * Sending a prompt opens the full Core workspace.
 */
export function CoreAskOrb() {
  const { isCompactOpen, closeCompact, open } = useAssistant();
  const { ask, busy } = useCoreChat();
  const [text, setText] = useState("");
  const [mounted, setMounted] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!isCompactOpen) {
      setText("");
      return;
    }
    const id = window.setTimeout(() => inputRef.current?.focus(), 40);
    return () => window.clearTimeout(id);
  }, [isCompactOpen]);

  if (!mounted || !isCompactOpen) return null;

  const submit = (event?: FormEvent) => {
    event?.preventDefault();
    const trimmed = text.trim();
    if (!trimmed || busy) return;
    ask(trimmed);
    setText("");
    closeCompact();
    open();
  };

  const onKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
    if (event.key === "Escape") {
      event.preventDefault();
      closeCompact();
      return;
    }
    if (event.key !== "Enter" || event.nativeEvent.isComposing) return;
    event.preventDefault();
    submit();
  };

  return createPortal(
    <div className="core-ask-orb-layer" role="dialog" aria-label={userCopy.ai.entryLabel}>
      <button type="button" aria-label={userCopy.ai.close} className="core-ask-orb-scrim" onClick={closeCompact} />
      <div className="core-ask-orb-slot">
        <form onSubmit={submit} className="core-composer ai-rise mx-auto w-full max-w-[40rem]">
          <div className="core-composer-dock is-focused flex flex-col rounded-xl border border-border bg-card">
            <input
              ref={inputRef}
              value={text}
              onChange={(event) => setText(event.target.value)}
              onKeyDown={onKeyDown}
              placeholder={userCopy.ai.composerPlaceholder}
              disabled={busy}
              className="core-composer-field min-h-9 w-full bg-transparent px-3 py-2 text-[15px] text-foreground outline-none placeholder:text-muted-foreground"
            />
            <div className="core-composer-toolbar flex items-center justify-end border-t border-border/80 px-1.5 py-1.5">
              <button
                type="submit"
                aria-label={userCopy.ai.send}
                disabled={!text.trim() || busy}
                className="core-run inline-flex h-7 items-center rounded-md bg-foreground px-3 text-xs font-medium text-background disabled:opacity-30"
              >
                {userCopy.ai.send}
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>,
    document.body,
  );
}
