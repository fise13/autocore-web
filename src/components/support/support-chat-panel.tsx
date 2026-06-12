"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { format } from "date-fns";
import { ru } from "date-fns/locale";
import { Loader2, Send, UserRound } from "lucide-react";

import { useAuth } from "@/components/providers/auth-provider";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { SupportMessage, SupportThread } from "@/domain/support-thread";
import { createSupportThreadRepository } from "@/infrastructure/firestore/support-thread-repository";
import { buildSupportBotReply, SUPPORT_WELCOME_MESSAGE } from "@/lib/support/support-bot";
import { normalizeCompanyId } from "@/lib/company-id";
import { cn } from "@/lib/utils";

const repository = createSupportThreadRepository();

type SupportChatPanelProps = {
  mode: "user" | "agent";
  thread: SupportThread | null;
  className?: string;
  onRequestHuman?: () => void;
  requestingHuman?: boolean;
};

export function SupportChatPanel({
  mode,
  thread,
  className,
  onRequestHuman,
  requestingHuman = false,
}: SupportChatPanelProps) {
  const { profile } = useAuth();
  const companyId = normalizeCompanyId(profile?.companyId);
  const [messages, setMessages] = useState<SupportMessage[]>([]);
  const [draft, setDraft] = useState("");
  const [sending, setSending] = useState(false);
  const [bootstrapping, setBootstrapping] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!companyId || !thread?.id) {
      setMessages([]);
      return;
    }
    return repository.subscribeMessages(companyId, thread.id, setMessages);
  }, [companyId, thread?.id]);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [messages.length]);

  useEffect(() => {
    if (mode !== "user" || !companyId || !thread?.id || messages.length > 0) return;

    let cancelled = false;
    setBootstrapping(true);
    void repository
      .addMessage({
        companyId,
        threadId: thread.id,
        role: "bot",
        text: SUPPORT_WELCOME_MESSAGE,
      })
      .finally(() => {
        if (!cancelled) setBootstrapping(false);
      });

    return () => {
      cancelled = true;
    };
  }, [mode, companyId, thread?.id, messages.length]);

  const sendMessage = useCallback(async () => {
    if (!companyId || !thread?.id || !profile?.id) return;
    const text = draft.trim();
    if (!text) return;

    setSending(true);
    setDraft("");
    try {
      if (mode === "user") {
        await repository.addMessage({
          companyId,
          threadId: thread.id,
          role: "user",
          text,
          authorId: profile.id,
        });
        if (thread.status === "bot" || thread.status === "open") {
          const reply = buildSupportBotReply(text);
          await repository.addMessage({
            companyId,
            threadId: thread.id,
            role: "bot",
            text: reply,
          });
        }
      } else {
        await repository.addMessage({
          companyId,
          threadId: thread.id,
          role: "agent",
          text,
          authorId: profile.id,
        });
        if (thread.status !== "human") {
          await repository.updateStatus(companyId, thread.id, "human");
        }
      }
    } finally {
      setSending(false);
    }
  }, [companyId, draft, mode, profile?.id, thread?.id, thread?.status]);

  if (!thread) {
    return (
      <div className={cn("flex flex-1 items-center justify-center p-6 text-sm text-muted-foreground", className)}>
        Выберите диалог или откройте чат поддержки.
      </div>
    );
  }

  return (
    <div className={cn("flex min-h-0 flex-1 flex-col", className)}>
      <div ref={scrollRef} className="min-h-0 flex-1 space-y-3 overflow-y-auto p-4">
        {bootstrapping && messages.length === 0 ? (
          <div className="flex justify-center py-8 text-muted-foreground">
            <Loader2 className="size-5 animate-spin" />
          </div>
        ) : null}
        {messages.map((message) => {
          const isUser = message.role === "user";
          const isAgent = message.role === "agent";
          const alignRight = mode === "user" ? isUser : isAgent;
          return (
            <div
              key={message.id}
              className={cn("flex", alignRight ? "justify-end" : "justify-start")}
            >
              <div
                className={cn(
                  "max-w-[85%] rounded-2xl px-3 py-2 text-sm leading-relaxed",
                  message.role === "bot" && "bg-muted text-foreground",
                  message.role === "system" && "bg-amber-500/10 text-amber-900 dark:text-amber-100",
                  isUser && "bg-primary text-primary-foreground",
                  isAgent && "bg-emerald-600 text-white",
                )}
              >
                <p>{message.text}</p>
                <p className="mt-1 text-[0.6875rem] opacity-70">
                  {format(message.createdAt, "HH:mm", { locale: ru })}
                </p>
              </div>
            </div>
          );
        })}
      </div>

      <div className="border-t bg-background p-3">
        {mode === "user" && onRequestHuman ? (
          <div className="mb-2 flex justify-end">
            <Button
              type="button"
              variant="outline"
              size="sm"
              disabled={requestingHuman || thread.status === "awaiting_human" || thread.status === "human"}
              onClick={onRequestHuman}
            >
              <UserRound className="size-3.5" data-icon="inline-start" />
              {thread.status === "awaiting_human"
                ? "Ожидаем оператора"
                : thread.status === "human"
                  ? "Оператор подключён"
                  : "Позвать оператора"}
            </Button>
          </div>
        ) : null}
        <div className="flex gap-2">
          <Textarea
            value={draft}
            onChange={(event) => setDraft(event.target.value)}
            placeholder={mode === "agent" ? "Ответ пользователю…" : "Напишите вопрос…"}
            rows={2}
            className="min-h-[3rem] resize-none"
            onKeyDown={(event) => {
              if (event.key === "Enter" && !event.shiftKey) {
                event.preventDefault();
                void sendMessage();
              }
            }}
          />
          <Button type="button" size="icon" disabled={sending || !draft.trim()} onClick={() => void sendMessage()}>
            {sending ? <Loader2 className="size-4 animate-spin" /> : <Send className="size-4" />}
          </Button>
        </div>
      </div>
    </div>
  );
}
