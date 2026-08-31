"use client";

import { useCallback } from "react";
import { Plus } from "lucide-react";

import { useAssistantOptional } from "@/components/ai/ai-provider";
import { useCoreChatOptional } from "@/components/ai/core-chat-runtime";
import { Badge } from "@/components/ui/badge";
import { userCopy } from "@/lib/user-copy";
import { cn } from "@/lib/utils";

type AutoCoreAIButtonProps = {
  collapsed?: boolean;
  className?: string;
};

/**
 * Dock “+” on web — liquid-glass Ask Core.
 * Opens the compact orb; send expands into `/ai`.
 */
export function AutoCoreAIButton({ collapsed = false, className }: AutoCoreAIButtonProps) {
  const assistant = useAssistantOptional();
  const chat = useCoreChatOptional();

  const handleRef = useCallback(
    (element: HTMLButtonElement | null) => {
      assistant?.registerEntry(element);
    },
    [assistant],
  );

  if (!assistant) return null;

  const { state, isOpen, isCompactOpen, openCompact, closeCompact, close, setPointer } = assistant;
  const busy = chat?.busy ?? false;
  const expanded = isCompactOpen || isOpen;
  const glyphState = busy ? "thinking" : expanded ? "active" : state;
  const entryAria = `${userCopy.ai.entryLabel}, ${userCopy.ai.entryBeta}`;

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
        aria-expanded={isCompactOpen}
        aria-label={expanded ? userCopy.ai.close : entryAria}
        title={collapsed ? entryAria : undefined}
        onPointerEnter={() => setPointer("enter")}
        onPointerLeave={() => setPointer("leave")}
        onFocus={() => setPointer("enter")}
        onBlur={() => setPointer("leave")}
        onClick={() => {
          if (isOpen) close();
          else if (isCompactOpen) closeCompact();
          else openCompact();
        }}
        className={cn(
          "ai-entry-button core-liquid-glass group relative flex w-full items-center justify-center",
          "text-foreground",
          "transition-[transform,opacity] duration-150 ease-out",
          "hover:opacity-90",
          "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sidebar-ring/60",
          "active:scale-[0.98]",
          collapsed ? "size-9 rounded-full p-0" : "h-10 gap-2 rounded-full px-3",
        )}
      >
        <Plus
          data-icon="inline-start"
          className={cn(
            "shrink-0 size-4 transition-transform duration-200 ease-out",
            expanded && "rotate-45",
          )}
          aria-hidden
        />
        {!collapsed ? (
          <>
            <span data-sidebar-hide-collapsed className="truncate text-sm font-medium leading-none">
              {userCopy.ai.entryLabel}
            </span>
            <Badge
              variant="outline"
              className="h-4 shrink-0 border-sidebar-border/80 px-1.5 text-[10px] font-medium leading-none text-muted-foreground"
            >
              {userCopy.ai.entryBeta}
            </Badge>
          </>
        ) : null}
      </button>
    </div>
  );
}
