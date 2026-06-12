"use client";

import { useCallback, useEffect, useState } from "react";
import { MessageCircle, X } from "lucide-react";

import { SupportChatPanel } from "@/components/support/support-chat-panel";
import { useAuth } from "@/components/providers/auth-provider";
import { SupportThread } from "@/domain/support-thread";
import { createSupportThreadRepository } from "@/infrastructure/firestore/support-thread-repository";
import { getFirebaseAuth } from "@/infrastructure/firebase/client";
import { getPlatformContacts } from "@/lib/platform/platform-contacts";
import { normalizeCompanyId } from "@/lib/company-id";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";

const repository = createSupportThreadRepository();
const contacts = getPlatformContacts();

export function SupportWidget() {
  const { profile } = useAuth();
  const companyId = normalizeCompanyId(profile?.companyId);
  const [open, setOpen] = useState(false);
  const [thread, setThread] = useState<SupportThread | null>(null);
  const [requestingHuman, setRequestingHuman] = useState(false);

  useEffect(() => {
    if (!companyId || !profile?.id) {
      setThread(null);
      return;
    }
    return repository.subscribeUserThread(companyId, profile.id, setThread);
  }, [companyId, profile?.id]);

  useEffect(() => {
    if (!open || !companyId || !profile?.id) return;
    void repository
      .findOrCreateThread({
        companyId,
        userId: profile.id,
        userName: profile.displayName ?? profile.email,
        userEmail: profile.email,
      })
      .then(setThread)
      .catch(() => undefined);
  }, [open, companyId, profile?.displayName, profile?.email, profile?.id]);

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
    <>
      <div className="fixed right-4 bottom-4 z-50 flex flex-col items-end gap-2 md:right-6 md:bottom-6">
        {open ? (
          <div
            className={cn(
              "flex h-[min(32rem,calc(100vh-6rem))] w-[min(24rem,calc(100vw-2rem))] flex-col overflow-hidden rounded-2xl border bg-background shadow-2xl",
            )}
          >
            <div className="flex items-center justify-between border-b px-4 py-3">
              <div>
                <p className="text-sm font-semibold">Поддержка AutoCore</p>
                <p className="text-xs text-muted-foreground">
                  {contacts.formattedPhone} · {contacts.email}
                </p>
              </div>
              <Button type="button" variant="ghost" size="icon-sm" onClick={() => setOpen(false)}>
                <X className="size-4" />
              </Button>
            </div>
            <SupportChatPanel
              mode="user"
              thread={thread}
              onRequestHuman={() => void requestHuman()}
              requestingHuman={requestingHuman}
            />
          </div>
        ) : null}

        <Button
          type="button"
          size="lg"
          className="rounded-full shadow-lg"
          onClick={() => setOpen((value) => !value)}
        >
          <MessageCircle className="size-4" data-icon="inline-start" />
          {open ? "Свернуть" : "Поддержка"}
        </Button>
      </div>
    </>
  );
}
