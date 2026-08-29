"use client";

import { useCallback } from "react";
import { Plus } from "lucide-react";

import { useAssistantOptional } from "@/components/ai/ai-provider";
import { useCoreChatOptional } from "@/components/ai/core-chat-runtime";
import { userCopy } from "@/lib/user-copy";
import { cn } from "@/lib/utils";

type AutoCoreAIButtonProps = {
  collapsed?: boolean;
  className?: string;
};

/**
 * Global Core entry in the sidebar.
 *
 * Minimal Efferd-style CTA (“New Conversation”): solid inverted pill, leading
 * plus, short label. Opens the Core product route (`/ai`).
 */
export function AutoCoreAIButton({ collapsed = false, className }: AutoCoreAIButtonProps) {
  const assistant = useAssistantOptional();
  // Busy comes from the real stream now, not a timer the provider set itself.
  const chat = useCoreChatOptional();

  const handleRef = useCallback(
    (element: HTMLButtonElement | null) => {
      assistant?.registerEntry(element);
    },
    [assistant],
  );

  if (!assistant) return null;

  const { state, isOpen, open, close, setPointer } = assistant;
  const busy = chat?.busy ?? false;
  /** The glyph reads `data-state`; a live stream outranks pointer affordance. */
  const glyphState = busy ? "thinking" : isOpen ? "active" : state;

  return (
    <div
      className={cn(
        "shrink-0 border-t border-sidebar-border/60",
        collapsed ? "px-1.5 py-2.5" : "px-2 py-2.5",
        className,
      )}
    >
      <button
        ref={handleRef}
        type="button"
        data-ai-entry
        data-state={glyphState}
        aria-current={isOpen ? "page" : undefined}
        aria-label={userCopy.ai.entryLabel}
        title={collapsed ? userCopy.ai.entryLabel : undefined}
        onPointerEnter={() => setPointer("enter")}
        onPointerLeave={() => setPointer("leave")}
        onFocus={() => setPointer("enter")}
        onBlur={() => setPointer("leave")}
        onClick={() => (isOpen ? close() : open())}
        className={cn(
          "ai-entry-button group relative flex w-full items-center justify-center overflow-hidden",
          "rounded-lg bg-foreground text-background",
          "transition-[transform,opacity,background-color] duration-150 ease-out",
          "hover:bg-foreground/90",
          "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sidebar-ring/60",
          "active:scale-[0.98]",
          isOpen && "ring-2 ring-foreground/25 ring-offset-2 ring-offset-sidebar",
          busy && "opacity-90",
          collapsed ? "size-9 p-0" : "h-9 gap-2 px-3",
        )}
      >
        <Plus
          data-icon="inline-start"
          className={cn("shrink-0", collapsed ? "size-4" : "size-4")}
          aria-hidden
        />
        {!collapsed ? (
          <span data-sidebar-hide-collapsed className="truncate text-sm font-medium leading-none">
            {userCopy.ai.entryLabel}
          </span>
        ) : null}
      </button>
    </div>
  );
}
