"use client";

import { getToolName, isToolUIPart } from "ai";
import Link from "next/link";

import {
  Conversation,
  ConversationContent,
  ConversationScrollButton,
} from "@/components/ai-elements/conversation";
import { MessageResponse } from "@/components/ai-elements/message";
import { CoreStatus } from "@/components/ai/core-status";
import { ToolPartRenderer } from "@/components/ai/tools/tool-part-renderer";
import type { CoreUIMessage, CoreUIPart } from "@/domain/ai/core-message";
import { userCopy } from "@/lib/user-copy";
import { cn } from "@/lib/utils";

function textOf(message: CoreUIMessage): string {
  return message.parts
    .filter((part): part is Extract<CoreUIPart, { type: "text" }> => part.type === "text")
    .map((part) => part.text)
    .join("");
}

function fileParts(message: CoreUIMessage) {
  return message.parts.filter(
    (part): part is Extract<CoreUIPart, { type: "file" }> => part.type === "file",
  );
}

function assistantVisibleParts(parts: CoreUIPart[]): CoreUIPart[] {
  return parts.filter((part) => part.type === "text" || part.type.startsWith("tool-"));
}

function hasVisibleAssistantWork(message: CoreUIMessage | undefined): boolean {
  if (!message || message.role !== "assistant") return false;
  return message.parts.some((part) => {
    if (part.type === "text") return Boolean(part.text?.trim());
    return part.type.startsWith("tool-");
  });
}

function hrefFromUnknown(value: unknown): string | undefined {
  if (!value || typeof value !== "object") return undefined;
  const record = value as Record<string, unknown>;
  if (typeof record.href === "string" && record.href.startsWith("/")) return record.href;
  if (record.order && typeof record.order === "object") {
    const href = (record.order as { href?: unknown }).href;
    if (typeof href === "string" && href.startsWith("/")) return href;
  }
  return undefined;
}

function resolvedTermFromUnknown(value: unknown): string | undefined {
  if (!value || typeof value !== "object") return undefined;
  const term = (value as { resolvedTerm?: unknown }).resolvedTerm;
  return typeof term === "string" && term.trim() ? term.trim() : undefined;
}

function turnActions(message: CoreUIMessage): Array<{ label: string; href: string }> {
  const copy = userCopy.ai;
  const seen = new Set<string>();
  const actions: Array<{ label: string; href: string }> = [];

  const push = (label: string, href: string) => {
    const key = `${label}:${href}`;
    if (seen.has(key)) return;
    seen.add(key);
    actions.push({ label, href });
  };

  for (const part of message.parts) {
    if (!isToolUIPart(part) || part.state !== "output-available") continue;
    const output = part.output as { ok?: boolean } | undefined;
    if (!output || output.ok === false) continue;
    const href = hrefFromUnknown(output);
    const name = getToolName(part);

    if (name === "searchEngines" || name === "searchInventory" || name === "findStockLocation") {
      if (href) push(copy.actionViewInventory, href);
      const term = resolvedTermFromUnknown(output);
      if (term && href) push(copy.actionFilterTerm(term), href);
      continue;
    }
    if (name === "getFinanceSummary" || name === "createAccountingOperation") {
      if (href) push(copy.actionOpenFinance, href);
      continue;
    }
    if (
      name === "listWorkOrders" ||
      name === "getWorkOrder" ||
      name === "createWorkOrder" ||
      name === "transitionWorkOrderStatus"
    ) {
      if (href) push(copy.actionOpenOrder, href);
      continue;
    }
    if (name === "createClient" || name === "searchClients") {
      if (href) push(copy.actionViewCustomer, href);
      continue;
    }
    if (name === "ensureWorkOrderDocuments") {
      if (href) push(copy.actionOpenDocuments, href);
      continue;
    }
    if (name === "navigateTo" && href) {
      push(copy.tool.openInAutocore, href);
    }
  }

  return actions.slice(0, 4);
}

function UserTurn({ message, featured }: { message: CoreUIMessage; featured: boolean }) {
  const text = textOf(message);
  const files = fileParts(message);
  if (!text.trim() && files.length === 0) return null;

  return (
    <article className="core-turn core-turn--request">
      {files.length > 0 ? (
        <div className="mb-3 flex flex-wrap gap-1.5">
          {files.map((file) =>
            file.mediaType.startsWith("image/") ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                key={file.url}
                src={file.url}
                alt={file.filename ?? userCopy.ai.attachedFiles}
                className="size-14 rounded-md object-cover"
              />
            ) : (
              <span
                key={file.url}
                className="inline-flex max-w-[12rem] items-center truncate rounded-md border border-border px-2 py-1 text-xs text-muted-foreground"
              >
                {file.filename ?? userCopy.ai.attachedFiles}
              </span>
            ),
          )}
        </div>
      ) : null}
      {text.trim() && text.trim() !== userCopy.ai.attachedFiles ? (
        featured ? (
          <h2 className="core-request">{text}</h2>
        ) : (
          <p className="core-request-follow">{text}</p>
        )
      ) : null}
    </article>
  );
}

function AssistantTurn({
  message,
  streaming,
}: {
  message: CoreUIMessage;
  streaming: boolean;
}) {
  const parts = assistantVisibleParts(message.parts);
  const actions = turnActions(message);
  if (parts.length === 0 && actions.length === 0) return null;

  return (
    <article className="core-turn core-turn--response">
      {parts.map((part, index) => {
        if (part.type === "text") {
          if (!part.text?.trim()) return null;
          const previous = parts[index - 1];
          if (previous?.type === "text" && previous.text?.trim() === part.text.trim()) return null;
          return (
            <MessageResponse key={`${message.id}-text-${index}`} className="core-prose">
              {part.text}
            </MessageResponse>
          );
        }
        if (part.type.startsWith("tool-")) {
          return (
            <ToolPartRenderer key={`${message.id}-tool-${index}`} part={part} live={streaming} />
          );
        }
        return null;
      })}
      {actions.length > 0 && !streaming ? (
        <div className="core-actions">
          {actions.map((action) => (
            <Link key={`${action.label}-${action.href}`} href={action.href} className="core-action">
              {action.label}
            </Link>
          ))}
        </div>
      ) : null}
    </article>
  );
}

export function CoreConversation({
  messages,
  busy,
  errorReason,
  onRetry,
}: {
  messages: CoreUIMessage[];
  busy: boolean;
  errorReason: string | null;
  onRetry: () => void;
}) {
  const last = messages[messages.length - 1];
  const showProcessing = busy && !hasVisibleAssistantWork(last);

  return (
    <Conversation className="min-h-0">
      <ConversationContent className={cn("core-thread")}>
        {messages.map((message, index) => {
          if (message.role === "user") {
            const featured = messages.findIndex((item) => item.role === "user") === index;
            return <UserTurn key={message.id} message={message} featured={featured} />;
          }
          if (message.role !== "assistant") return null;
          return (
            <AssistantTurn
              key={message.id}
              message={message}
              streaming={busy && index === messages.length - 1}
            />
          );
        })}

        {showProcessing ? <CoreStatus label={userCopy.ai.processing} /> : null}

        {errorReason ? (
          <div className="core-error">
            <p>{errorReason}</p>
            <button type="button" className="core-action" onClick={onRetry}>
              {userCopy.ai.retry}
            </button>
          </div>
        ) : null}
      </ConversationContent>
      <ConversationScrollButton className="core-scroll-fab" />
    </Conversation>
  );
}
