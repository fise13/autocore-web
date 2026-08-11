"use client";

import { useCallback, type FormEvent } from "react";

import {
  Conversation,
  ConversationContent,
  ConversationEmptyState,
  ConversationScrollButton,
} from "@/components/ai-elements/conversation";
import { Message, MessageContent, MessageResponse } from "@/components/ai-elements/message";
import {
  PromptInput,
  PromptInputBody,
  PromptInputFooter,
  PromptInputSubmit,
  PromptInputTextarea,
  type PromptInputMessage,
} from "@/components/ai/prompt-input";
import {
  Reasoning,
  ReasoningContent,
  ReasoningTrigger,
} from "@/components/ai-elements/reasoning";
import { Suggestions } from "@/components/ai-elements/suggestion";
import { useAssistant } from "@/components/ai/ai-provider";
import { useCoreSuggestions } from "@/components/ai/use-core-suggestions";
import type { CoreSuggestion } from "@/domain/ai/suggestions";
import { useCoreChat } from "@/components/ai/core-chat-runtime";
import { PendingDots, ToolError } from "@/components/ai/tools/tool-activity";
import { ToolPartRenderer } from "@/components/ai/tools/tool-part-renderer";
import { AppLogo } from "@/components/brand/app-logo";
import { Button } from "@/components/ui/button";
import type { CoreUIMessage, CoreUIPart } from "@/domain/ai/core-message";
import { userCopy } from "@/lib/user-copy";
import { cn } from "@/lib/utils";

/** True when the assistant already delivered text or a finished tool card this turn. */
function assistantHasVisibleContent(message: CoreUIMessage | undefined): boolean {
  if (!message || message.role !== "assistant") return false;
  return message.parts.some((part) => {
    if (part.type === "text") return Boolean(part.text?.trim());
    if (part.type.startsWith("tool-")) {
      return "state" in part && (part.state === "output-available" || part.state === "output-error");
    }
    return false;
  });
}

/**
 * Render one streamed message part.
 *
 * Reasoning appears **only** when the model actually emitted a reasoning part —
 * there is no fabricated "Thinking…" placeholder, and no locally composed
 * narration standing in for one.
 */
function PartView({ part, streaming }: { part: CoreUIPart; streaming: boolean }) {
  if (part.type === "text") {
    if (!part.text) return null;
    return <MessageResponse>{part.text}</MessageResponse>;
  }

  if (part.type === "reasoning") {
    if (!part.text?.trim()) return null;
    const active = streaming && part.state === "streaming";
    return (
      <Reasoning isStreaming={active} defaultOpen={false} className="mb-0 w-full">
        <ReasoningTrigger />
        <ReasoningContent>{part.text}</ReasoningContent>
      </Reasoning>
    );
  }

  if (part.type.startsWith("tool-")) {
    return <ToolPartRenderer part={part} />;
  }

  return null;
}

/**
 * Merge consecutive reasoning parts into one block.
 *
 * A multi-step answer emits a reasoning part per step, which rendered as a
 * stack of five "Reasoned for Ns" collapsibles between the tool cards. Merging
 * adjacent runs keeps one panel per stretch of thinking, the way Claude and
 * ChatGPT present it, without hiding reasoning that happened after a tool ran.
 */
function mergeReasoning(parts: CoreUIPart[]): CoreUIPart[] {
  const merged: CoreUIPart[] = [];

  for (const part of parts) {
    const previous = merged[merged.length - 1];
    if (part.type === "reasoning" && previous?.type === "reasoning") {
      merged[merged.length - 1] = {
        ...previous,
        text: `${previous.text}\n\n${part.text}`.trim(),
        // The run is still open while its newest part is streaming.
        state: part.state,
      };
      continue;
    }
    merged.push(part);
  }

  return merged;
}

function MessageView({
  message,
  streaming,
}: {
  message: CoreUIMessage;
  streaming: boolean;
}) {
  if (message.role === "user") {
    const text = message.parts
      .filter((part): part is Extract<CoreUIPart, { type: "text" }> => part.type === "text")
      .map((part) => part.text)
      .join("");
    if (!text.trim()) return null;
    return (
      <Message from="user">
        <MessageContent>{text}</MessageContent>
      </Message>
    );
  }

  if (message.role !== "assistant") return null;

  // While a turn is submitted but nothing has arrived, show a wordless
  // indicator rather than claiming the model is doing something specific.
  const rendered = mergeReasoning(
    message.parts.filter(
      (part) => part.type === "text" || part.type === "reasoning" || part.type.startsWith("tool-"),
    ),
  );

  return (
    <Message from="assistant">
      <MessageContent className="w-full max-w-none items-start gap-3">
        {rendered.length === 0 && streaming ? <PendingDots /> : null}
        {rendered.map((part, index) => (
          <PartView key={`${message.id}-${index}`} part={part} streaming={streaming} />
        ))}
      </MessageContent>
    </Message>
  );
}

/**
 * Empty-state prompt chip.
 *
 * When the server could read live data, the chip carries the figure that
 * justified it — "Parts below reorder point · 8" — so the first screen already
 * says something true about the company rather than offering generic prompts.
 */
function SuggestionChip({
  suggestion,
  onSelect,
}: {
  suggestion: CoreSuggestion;
  onSelect: (prompt: string) => void;
}) {
  return (
    <button
      type="button"
      onClick={() => onSelect(suggestion.prompt)}
      className={cn(
        "inline-flex min-h-9 shrink-0 items-center gap-2 rounded-full border px-3",
        "text-[13px] leading-none transition-colors",
        suggestion.tone === "attention"
          ? "border-warning-border bg-warning-subtle text-warning-on-subtle hover:bg-warning-subtle/70"
          : "border-border bg-card text-foreground hover:bg-muted",
      )}
    >
      <span className="truncate">{suggestion.label}</span>
      {suggestion.hint ? (
        <span
          className={cn(
            "shrink-0 rounded-full px-1.5 py-0.5 text-[11px] leading-none tabular-nums",
            suggestion.tone === "attention" ? "bg-warning/20" : "bg-muted text-muted-foreground",
          )}
        >
          {suggestion.hint}
        </span>
      ) : null}
    </button>
  );
}

/**
 * Core product workspace.
 *
 * Streams token-by-token over the AI SDK; structure comes from tool calls that
 * render as real product surfaces rather than from a JSON block contract.
 */
export function AIWorkspace() {
  const { context } = useAssistant();
  const { messages, status, error, busy, ask, stop, regenerate, clearError } = useCoreChat();

  const isEmpty = messages.length === 0 && !busy;
  // Only fetched while the empty state is on screen — the chips are the only
  // consumer, so an active chat should not be reading Firestore.
  const { suggestions } = useCoreSuggestions(
    { pathname: context.path },
    context.suggestions,
    isEmpty,
  );

  const submit = useCallback(
    (question: string) => {
      const trimmed = question.trim();
      if (!trimmed) return;
      clearError();
      ask(trimmed);
    },
    [ask, clearError],
  );

  const handlePromptSubmit = useCallback(
    (message: PromptInputMessage, event: FormEvent<HTMLFormElement>) => {
      event.preventDefault();
      submit(message.text);
    },
    [submit],
  );

  const lastMessage = messages[messages.length - 1];
  const lastId = lastMessage?.id;
  const errorReason = error
    ? assistantHasVisibleContent(lastMessage)
      ? userCopy.ai.errorInterrupted
      : error.message || userCopy.ai.errorGeneric
    : null;

  return (
    <div className="flex h-full min-h-0 flex-col overflow-hidden bg-background">
      <Conversation className="min-h-0">
        <ConversationContent
          className={cn(
            "mx-auto w-full gap-5 px-3 pb-4 sm:px-4 md:px-6",
            "max-w-[var(--container-chat,48rem)]",
            // Clears the shell's translucent header, which overlays the scroller.
            "pt-[calc(var(--app-header-height,3.5rem)+1rem)]",
          )}
        >
          {isEmpty ? (
            <ConversationEmptyState className="min-h-[40vh] py-8 sm:py-12">
              <div className="flex w-full max-w-xl flex-col items-center gap-4">
                <AppLogo size={48} className="size-12" />
                <div className="space-y-1 text-center">
                  <h3 className="text-lg font-semibold tracking-tight">{userCopy.ai.emptyTitle}</h3>
                  <p className="text-balance text-sm text-muted-foreground">
                    {userCopy.ai.emptyBody}
                  </p>
                </div>
                <div className="flex w-full flex-col gap-2 pt-2">
                  <p className="text-center text-[10px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
                    {userCopy.ai.suggestionsLabel}
                  </p>
                  <Suggestions className="flex-wrap justify-center gap-2 px-1">
                    {suggestions.map((suggestion) => (
                      <SuggestionChip
                        key={suggestion.prompt}
                        suggestion={suggestion}
                        onSelect={submit}
                      />
                    ))}
                  </Suggestions>
                </div>
              </div>
            </ConversationEmptyState>
          ) : (
            <>
              {messages.map((message) => (
                <MessageView
                  key={message.id}
                  message={message}
                  streaming={busy && message.id === lastId}
                />
              ))}

              {errorReason ? (
                <div className="flex w-full flex-col items-start gap-2">
                  <ToolError reason={errorReason} />
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => regenerate()}
                    className="h-8 px-2 text-xs"
                  >
                    {userCopy.ai.retry}
                  </Button>
                </div>
              ) : null}
            </>
          )}
        </ConversationContent>
        <ConversationScrollButton />
      </Conversation>

      <div
        className={cn(
          "shrink-0 px-3 pt-2 sm:px-4 md:px-6",
          "pb-[max(0.75rem,env(safe-area-inset-bottom))] md:pb-5",
        )}
      >
        <PromptInput
          onSubmit={handlePromptSubmit}
          accept={undefined}
          maxFiles={0}
          className={cn(
            "mx-auto min-h-12 items-center rounded-2xl border-border/70 bg-muted/45 shadow-none",
            "max-w-[var(--container-chat,48rem)]",
            "has-[[data-slot=input-group-control]:focus-visible]:border-ring",
            "has-[[data-slot=input-group-control]:focus-visible]:ring-2",
            "has-[[data-slot=input-group-control]:focus-visible]:ring-ring/40",
          )}
        >
          <PromptInputBody>
            <PromptInputTextarea
              placeholder={userCopy.ai.composerPlaceholder}
              className="max-h-32 min-h-0 resize-none border-0 bg-transparent px-4 py-3 text-[15px] leading-5 shadow-none focus-visible:ring-0 sm:text-sm"
            />
          </PromptInputBody>
          <PromptInputFooter align="inline-end" className="pr-1.5">
            <PromptInputSubmit
              status={status}
              onStop={stop}
              aria-label={busy ? userCopy.ai.stopped : userCopy.ai.send}
              className={cn(
                "size-9 rounded-xl bg-primary text-primary-foreground shadow-none",
                "hover:bg-primary/90 disabled:opacity-50 sm:size-8",
              )}
            />
          </PromptInputFooter>
        </PromptInput>
      </div>
    </div>
  );
}
