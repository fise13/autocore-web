"use client";

import { useCallback, useEffect, useState } from "react";
import { Loader2, MessageCircle } from "lucide-react";

import { SupportChatPanel } from "@/components/support/support-chat-panel";
import { useAuth } from "@/components/providers/auth-provider";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { SupportThread } from "@/domain/support-thread";
import { createSupportThreadRepository } from "@/infrastructure/firestore/support-thread-repository";
import { getFirebaseAuth } from "@/infrastructure/firebase/client";
import { normalizeCompanyId } from "@/lib/company-id";

const repository = createSupportThreadRepository();

export function SupportSettingsCard() {
  const { profile } = useAuth();
  const companyId = normalizeCompanyId(profile?.companyId);
  const [thread, setThread] = useState<SupportThread | null>(null);
  const [bootstrapping, setBootstrapping] = useState(true);
  const [requestingHuman, setRequestingHuman] = useState(false);

  useEffect(() => {
    if (!companyId || !profile?.id) {
      setThread(null);
      setBootstrapping(false);
      return;
    }

    let cancelled = false;
    setBootstrapping(true);

    void repository
      .findOrCreateThread({
        companyId,
        userId: profile.id,
        userName: profile.displayName ?? profile.email,
        userEmail: profile.email,
      })
      .then((next) => {
        if (!cancelled) setThread(next);
      })
      .finally(() => {
        if (!cancelled) setBootstrapping(false);
      });

    const unsubscribe = repository.subscribeUserThread(companyId, profile.id, (next) => {
      if (next) setThread(next);
    });

    return () => {
      cancelled = true;
      unsubscribe();
    };
  }, [companyId, profile?.displayName, profile?.email, profile?.id]);

  const requestHuman = useCallback(async () => {
    if (!companyId || !thread?.id || !profile?.id) return;
    setRequestingHuman(true);
    try {
      await repository.updateStatus(companyId, thread.id, "awaiting_human");
      await repository.addMessage({
        companyId,
        threadId: thread.id,
        role: "system",
        text: "Запрос передан оператору. Мы ответим в этом чате и на email.",
      });

      const token = await getFirebaseAuth().currentUser?.getIdToken();
      if (token) {
        await fetch("/api/support/notify-agent", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({ threadId: thread.id }),
        });
      }
    } finally {
      setRequestingHuman(false);
    }
  }, [companyId, profile?.id, thread?.id]);

  if (!profile?.companyId) return null;

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center gap-2">
          <MessageCircle className="size-4 text-primary" />
          <CardTitle>Поддержка</CardTitle>
        </div>
        <CardDescription>
          Задайте вопрос боту или позовите оператора — ответ придёт здесь и на ваш email.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex h-[min(28rem,60vh)] min-h-[20rem] flex-col overflow-hidden rounded-xl border bg-background">
          {bootstrapping ? (
            <div className="flex flex-1 items-center justify-center text-muted-foreground">
              <Loader2 className="size-5 animate-spin" />
            </div>
          ) : (
            <SupportChatPanel
              mode="user"
              thread={thread}
              onRequestHuman={() => void requestHuman()}
              requestingHuman={requestingHuman}
            />
          )}
        </div>
      </CardContent>
    </Card>
  );
}
