"use client";

import { Globe, ImageIcon, MessageSquarePlus, Pencil } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { useCallback } from "react";

import {
  Conversation,
  ConversationContent,
  ConversationScrollButton,
} from "@/components/ai-elements/conversation";
import { Message, MessageContent, MessageResponse } from "@/components/ai-elements/message";
import {
  Reasoning,
  ReasoningContent,
  ReasoningTrigger,
} from "@/components/ai-elements/reasoning";
import { useAssistant } from "@/components/ai/ai-provider";
import { CoreComposer } from "@/components/ai/core-composer";
import { useCoreChat } from "@/components/ai/core-chat-runtime";
import { ThinkingOrb } from "@/components/ai/thinking-orb";
import { ToolError } from "@/components/ai/tools/tool-activity";
import { ToolPartRenderer } from "@/components/ai/tools/tool-part-renderer";
import { useCoreSuggestions } from "@/components/ai/use-core-suggestions";
import { Button } from "@/components/ui/button";
import type { CoreSuggestion } from "@/domain/ai/suggestions";
import type { CoreUIMessage, CoreUIPart } from "@/domain/ai/core-message";
import { useDashboardLayout } from "@/components/layout/dashboard-layout-context";
import { userCopy } from "@/lib/user-copy";
import { cn } from "@/lib/utils";

function assistantHasVisibleContent(message: CoreUIMessage | undefined): boolean {
  if (!message || message.role !== "assistant") return false;
  return message.parts.some((part) => {
    if (part.type === "text") return Boolean(part.text?.trim());
    if (part.type === "reasoning") return Boolean(part.text?.trim());
    if (part.type.startsWith("tool-")) {
      return "state" in part && (part.state === "output-available" || part.state === "output-error");
    }
    return false;
  });
}

function assistantTurnStarted(message: CoreUIMessage | undefined): boolean {
  if (!message || message.role !== "assistant") return false;
  return message.parts.length > 0;
}

function PartView({ part, streaming }: { part: CoreUIPart; streaming: boolean }) {
  if (part.type === "text") {
    if (!part.text) return null;
    return <MessageResponse className="text-[15px] leading-6">{part.text}</MessageResponse>;
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

function mergeReasoning(parts: CoreUIPart[]): CoreUIPart[] {
  const merged: CoreUIPart[] = [];

  for (const part of parts) {
    const previous = merged[merged.length - 1];
    if (part.type === "reasoning" && previous?.type === "reasoning") {
      merged[merged.length - 1] = {
        ...previous,
        text: `${previous.text}\n\n${part.text}`.trim(),
        state: part.state,
      };
      continue;
    }
    merged.push(part);
  }

  return merged;
}

function fileParts(message: CoreUIMessage) {
  return message.parts.filter(
    (part): part is Extract<CoreUIPart, { type: "file" }> => part.type === "file",
  );
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
    const files = fileParts(message);
    if (!text.trim() && files.length === 0) return null;
    return (
      <Message from="user" className="max-w-[min(85%,28rem)]">
        <MessageContent
          className={cn(
            "items-end gap-2 text-[15px] leading-snug",
            files.length
              ? "group-[.is-user]:rounded-[1.25rem] group-[.is-user]:px-3 group-[.is-user]:py-2.5"
              : "group-[.is-user]:rounded-full group-[.is-user]:px-4 group-[.is-user]:py-2",
          )}
        >
          {files.length > 0 ? (
            <div className="flex flex-wrap justify-end gap-1.5">
              {files.map((file) =>
                file.mediaType.startsWith("image/") ? (
                  <img
                    key={file.url}
                    src={file.url}
                    alt={file.filename ?? userCopy.ai.attachedFiles}
                    className="size-16 rounded-xl object-cover"
                  />
                ) : null,
              )}
            </div>
          ) : null}
          {text.trim() && text.trim() !== userCopy.ai.attachedFiles ? text : null}
        </MessageContent>
      </Message>
    );
  }

  if (message.role !== "assistant") return null;

  const rendered = mergeReasoning(
    message.parts.filter(
      (part) => part.type === "text" || part.type === "reasoning" || part.type.startsWith("tool-"),
    ),
  );

  if (rendered.length === 0) return null;

  return (
    <Message from="assistant">
      <MessageContent className="w-full max-w-none items-start gap-3">
        {rendered.map((part, index) => (
          <PartView key={`${message.id}-${index}`} part={part} streaming={streaming} />
        ))}
      </MessageContent>
    </Message>
  );
}

function fallbackShortcuts() {
  return [
    {
      id: "image",
      label: userCopy.ai.shortcutImage,
      prompt: userCopy.ai.shortcutImagePrompt,
      Icon: ImageIcon,
    },
    {
      id: "write",
      label: userCopy.ai.shortcutWrite,
      prompt: userCopy.ai.shortcutWritePrompt,
      Icon: Pencil,
    },
    {
      id: "search",
      label: userCopy.ai.shortcutSearch,
      prompt: userCopy.ai.shortcutSearchPrompt,
      Icon: Globe,
    },
  ] as const;
}

function shortcutIcon(suggestion: CoreSuggestion, index: number): LucideIcon {
  if (suggestion.tone === "attention") return Pencil;
  return fallbackShortcuts()[index % 3]?.Icon ?? Globe;
}

function CoreChatHeader({
  hasChats,
  onNewChat,
}: {
  hasChats: boolean;
  onNewChat: () => void;
}) {
  const { toggleMobileSidebar } = useDashboardLayout();

  return (
    <header className="flex shrink-0 items-center justify-between px-4 pb-2 pt-3 md:hidden">
      <button
        type="button"
        aria-label={userCopy.ai.openChats}
        onClick={toggleMobileSidebar}
        className="relative flex size-10 items-center justify-center rounded-full bg-secondary"
      >
        <span className="core-menu-glyph" aria-hidden>
          <span />
          <span />
        </span>
        {hasChats ? <span className="core-menu-notify" /> : null}
      </button>
      <button
        type="button"
        aria-label={userCopy.ai.newChat}
        onClick={onNewChat}
        className="flex size-10 items-center justify-center rounded-full bg-secondary"
      >
        <MessageSquarePlus className="size-5" />
      </button>
    </header>
  );
}

/**
 * Core product workspace — ChatGPT-class chat surface over the live assistant.
 */
export function AIWorkspace() {
  const { context, sessions, newChat } = useAssistant();
  const { messages, status, error, busy, ask, stop, regenerate, clearError } = useCoreChat();

  const isEmpty = messages.length === 0 && !busy;
  const { suggestions } = useCoreSuggestions(
    { pathname: context.path },
    context.suggestions,
    isEmpty,
  );

  const submit = useCallback(
    (question: string, files?: Parameters<typeof ask>[1]) => {
      if (!question.trim() && !files?.length) return;
      clearError();
      ask(question, files);
    },
    [ask, clearError],
  );

  const lastMessage = messages[messages.length - 1];
  const lastId = lastMessage?.id;
  const showOrb = busy && !assistantTurnStarted(lastMessage);
  const errorReason = error
    ? assistantHasVisibleContent(lastMessage)
      ? userCopy.ai.errorInterrupted
      : error.message || userCopy.ai.errorGeneric
    : null;
  const staticRows = fallbackShortcuts();
  const liveRows = suggestions
    .filter((suggestion) => !staticRows.some((row) => row.prompt === suggestion.prompt))
    .slice(0, 2)
    .map((suggestion, index) => ({
      id: suggestion.prompt,
      label: suggestion.hint ? `${suggestion.label} · ${suggestion.hint}` : suggestion.label,
      prompt: suggestion.prompt,
      Icon: shortcutIcon(suggestion, index),
    }));
  const shortcutRows = [...staticRows, ...liveRows];

  return (
    <div className="flex h-full min-h-0 flex-col overflow-hidden bg-background">
      <CoreChatHeader
        hasChats={sessions.some((session) => session.messages.length > 0)}
        onNewChat={newChat}
      />

      <Conversation className="min-h-0">
        <ConversationContent
          className={cn(
            "mx-auto w-full gap-5 px-4 pb-4 md:px-6",
            "max-w-[40rem]",
            "pt-2 md:pt-8",
          )}
        >
          {isEmpty ? (
            <div className="flex w-full flex-col gap-5 pt-4 md:pt-6">
              {shortcutRows.map((item) => (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => submit(item.prompt)}
                  className="flex items-center gap-3 text-left transition-opacity hover:opacity-70"
                >
                  <item.Icon className="size-[18px] shrink-0 text-muted-foreground" strokeWidth={1.7} />
                  <span className="text-[15px] leading-5 text-foreground">{item.label}</span>
                </button>
              ))}
            </div>
          ) : (
            <>
              {messages.map((message) => (
                <MessageView
                  key={message.id}
                  message={message}
                  streaming={busy && message.id === lastId}
                />
              ))}

              {showOrb ? (
                <div className="flex justify-start py-1">
                  <ThinkingOrb size={22} />
                </div>
              ) : null}

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

      <div className="shrink-0 px-4 pt-2 md:px-6">
        <div className="core-composer-lift">
          <CoreComposer status={status} busy={busy} onAsk={submit} onStop={stop} />
        </div>
      </div>
    </div>
  );
}
