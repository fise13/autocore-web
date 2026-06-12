"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { formatDistanceToNow } from "date-fns";
import { ru } from "date-fns/locale";
import { Inbox } from "lucide-react";

import { SupportChatPanel } from "@/components/support/support-chat-panel";
import { useAuth } from "@/components/providers/auth-provider";
import { EmptyState } from "@/components/ui/empty-state";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { SupportThread } from "@/domain/support-thread";
import { createSupportThreadRepository } from "@/infrastructure/firestore/support-thread-repository";
import { can } from "@/lib/auth/permissions";
import { normalizeCompanyId } from "@/lib/company-id";
import { cn } from "@/lib/utils";

const repository = createSupportThreadRepository();

const STATUS_LABELS: Record<SupportThread["status"], string> = {
  open: "Новый",
  bot: "Бот",
  awaiting_human: "Ждёт оператора",
  human: "Оператор",
  closed: "Закрыт",
};

function canManageSupportInbox(profile: ReturnType<typeof useAuth>["profile"]) {
  if (!profile) return false;
  return profile.isCompanyOwner || profile.role === "owner" || profile.role === "admin" || can(profile, "settings_manage");
}

export function SupportInboxWorkspace() {
  const { profile, isLoading } = useAuth();
  const router = useRouter();
  const params = useParams();
  const routeThreadId = typeof params?.threadId === "string" ? params.threadId : null;
  const companyId = normalizeCompanyId(profile?.companyId);
  const allowed = canManageSupportInbox(profile);
  const [threads, setThreads] = useState<SupportThread[]>([]);

  useEffect(() => {
    if (!companyId || !allowed) {
      setThreads([]);
      return;
    }
    return repository.subscribeThreads(companyId, setThreads);
  }, [allowed, companyId]);

  const selectedThread = useMemo(
    () => threads.find((thread) => thread.id === routeThreadId) ?? threads[0] ?? null,
    [routeThreadId, threads],
  );

  if (isLoading) return null;

  if (!allowed) {
    return (
      <EmptyState
        icon={Inbox}
        title="Нет доступа"
        description="Inbox поддержки доступен владельцу, администратору или пользователю с правом «Настройки компании»."
      />
    );
  }

  return (
    <div className="mx-auto flex h-[calc(100vh-4.5rem)] max-w-6xl flex-col gap-4 p-4 md:p-6">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-semibold tracking-tight">Inbox поддержки</h1>
          <p className="text-sm text-muted-foreground">Диалоги пользователей компании с ботом и оператором.</p>
        </div>
      </div>

      <div className="grid min-h-0 flex-1 gap-4 md:grid-cols-[minmax(0,18rem)_minmax(0,1fr)]">
        <aside className="flex min-h-0 flex-col overflow-hidden rounded-xl border bg-card/60">
          <div className="border-b px-3 py-2 text-xs font-medium text-muted-foreground uppercase">
            Диалоги ({threads.length})
          </div>
          <div className="min-h-0 flex-1 overflow-y-auto">
            {threads.length === 0 ? (
              <p className="p-4 text-sm text-muted-foreground">Пока нет обращений.</p>
            ) : (
              threads.map((thread) => (
                <Link
                  key={thread.id}
                  href={`/support/inbox/${thread.id}`}
                  className={cn(
                    "block border-b px-3 py-3 transition hover:bg-muted/40",
                    selectedThread?.id === thread.id && "bg-muted/60",
                  )}
                >
                  <div className="flex items-start justify-between gap-2">
                    <p className="truncate text-sm font-medium">{thread.userName || thread.userEmail}</p>
                    <Badge variant="outline" className="shrink-0 text-[0.625rem]">
                      {STATUS_LABELS[thread.status]}
                    </Badge>
                  </div>
                  <p className="truncate text-xs text-muted-foreground">{thread.userEmail}</p>
                  <p className="mt-1 text-[0.6875rem] text-muted-foreground/80">
                    {formatDistanceToNow(thread.lastMessageAt, { addSuffix: true, locale: ru })}
                  </p>
                </Link>
              ))
            )}
          </div>
        </aside>

        <section className="flex min-h-0 flex-col overflow-hidden rounded-xl border bg-card/60">
          {selectedThread ? (
            <>
              <div className="flex items-center justify-between border-b px-4 py-3">
                <div>
                  <p className="font-medium">{selectedThread.userName || selectedThread.userEmail}</p>
                  <p className="text-xs text-muted-foreground">{selectedThread.userEmail}</p>
                </div>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => router.push(`/support/inbox/${selectedThread.id}`)}
                >
                  Прямая ссылка
                </Button>
              </div>
              <SupportChatPanel mode="agent" thread={selectedThread} />
            </>
          ) : (
            <SupportChatPanel mode="agent" thread={null} />
          )}
        </section>
      </div>
    </div>
  );
}
