"use client";

import { ArrowUp, Sparkles } from "lucide-react";
import { useEffect, useRef, useState, type FormEvent, type KeyboardEvent } from "react";
import { createPortal } from "react-dom";

import { useAssistant } from "@/components/ai/ai-provider";
import { useCoreChat } from "@/components/ai/core-chat-runtime";
import { userCopy } from "@/lib/user-copy";
import { cn } from "@/lib/utils";

/**
 * Compact Ask Core — the web sibling of the dock “+” bubble.
 * Liquid-glass stadium; send opens the full `/ai` thread.
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
      <button
        type="button"
        aria-label={userCopy.ai.close}
        className="core-ask-orb-scrim"
        onClick={closeCompact}
      />
      <div className="core-ask-orb-slot">
        <form
          onSubmit={submit}
          className={cn(
            "core-liquid-glass core-ask-orb ai-rise",
            "flex items-center gap-2 pl-4 pr-1.5",
          )}
        >
          <Sparkles className="size-4 shrink-0 text-muted-foreground" strokeWidth={1.8} />
          <input
            ref={inputRef}
            value={text}
            onChange={(event) => setText(event.target.value)}
            onKeyDown={onKeyDown}
            placeholder={userCopy.ai.composerPlaceholder}
            disabled={busy}
            className="min-h-12 min-w-0 flex-1 bg-transparent text-[17px] leading-[22px] text-foreground outline-none placeholder:text-muted-foreground"
          />
          <button
            type="submit"
            aria-label={userCopy.ai.send}
            disabled={!text.trim() || busy}
            className={cn(
              "flex size-8 shrink-0 items-center justify-center rounded-full bg-foreground text-background",
              "disabled:opacity-40",
            )}
          >
            <ArrowUp className="size-4" strokeWidth={2.6} />
          </button>
        </form>
      </div>
    </div>,
    document.body,
  );
}
