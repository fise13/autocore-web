"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";

import { useAuth } from "@/components/providers/auth-provider";
import { CompanyAvatar } from "@/components/layout/company-switcher-menu";
import { AuthJourneyShell } from "@/components/auth/auth-journey-shell";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Skeleton } from "@/components/ui/skeleton";
import { clearInviteToken, storePendingInvite } from "@/lib/invites/pending-invite";
import { inviteRequiresEmailMatch, type InvitePreview } from "@autocore/org";
import { cn } from "@/lib/utils";

type InviteAcceptScreenProps = {
  token: string;
};

const ROLE_LABELS: Record<string, string> = {
  owner: "Владелец",
  admin: "Администратор",
  manager: "Менеджер",
  employee: "Сотрудник",
  mechanic: "Механик",
  accountant: "Бухгалтер",
  diagnostician: "Диагност",
};

export function InviteAcceptScreen({ token }: InviteAcceptScreenProps) {
  const router = useRouter();
  const { firebaseUser, logout, refreshProfile } = useAuth();
  const [preview, setPreview] = useState<InvitePreview | null>(null);
  const [error, setError] = useState<{ title: string; message: string; code?: string } | null>(
    null,
  );
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const autoAcceptStarted = useRef(false);

  const loadPreview = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      storePendingInvite({ token });
      const response = await fetch(`/api/invites/${encodeURIComponent(token)}`);
      const payload = await response.json();
      if (!response.ok) {
        setError({
          title: payload.title ?? "Не удалось загрузить приглашение",
          message: payload.error ?? "Попробуйте позже",
          code: payload.code,
        });
        setPreview(null);
        return;
      }
      setPreview(payload.preview as InvitePreview);
    } catch {
      setError({
        title: "Нет соединения",
        message: "Проверьте интернет и попробуйте снова.",
        code: "network_error",
      });
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => {
    void loadPreview();
  }, [loadPreview]);

  const userEmail = firebaseUser?.email?.trim().toLowerCase() ?? "";
  const emailMismatch =
    preview && firebaseUser ? inviteRequiresEmailMatch(preview.email, userEmail) : false;

  async function handleAccept(switchToCompany: boolean) {
    setBusy(true);
    setError(null);
    try {
      const idToken = await firebaseUser?.getIdToken();
      if (!idToken) {
        router.push(`/login?invite=${encodeURIComponent(token)}`);
        return;
      }
      const response = await fetch("/api/invites/accept", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${idToken}`,
        },
        body: JSON.stringify({ token, switchToCompany }),
      });
      const payload = await response.json();
      if (!response.ok) {
        setError({
          title: payload.title ?? "Не удалось принять приглашение",
          message: payload.error ?? "Попробуйте снова",
          code: payload.code,
        });
        return;
      }
      clearInviteToken();
      await refreshProfile?.();
      router.replace("/");
    } catch {
      setError({
        title: "Ошибка",
        message: "Не удалось принять приглашение. Попробуйте снова.",
      });
    } finally {
      setBusy(false);
    }
  }

  const tryAutoAccept = useCallback(() => {
    if (autoAcceptStarted.current || loading || busy) return;
    if (!firebaseUser || !preview?.canAccept || emailMismatch) return;
    autoAcceptStarted.current = true;
    void handleAccept(true);
  }, [busy, emailMismatch, firebaseUser, loading, preview?.canAccept]);

  useEffect(() => {
    tryAutoAccept();
  }, [tryAutoAccept]);

  async function handleDecline() {
    setBusy(true);
    try {
      const idToken = await firebaseUser?.getIdToken();
      if (idToken) {
        await fetch("/api/invites/decline", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${idToken}`,
          },
          body: JSON.stringify({ token }),
        });
      }
      clearInviteToken();
      router.replace("/");
    } finally {
      setBusy(false);
    }
  }

  return (
    <AuthJourneyShell stepKey={token} layout="center" contentWidth="md">
      <div className="mx-auto flex w-full max-w-md flex-col gap-6 py-8">
        {loading ? (
          <div className="flex flex-col gap-4">
            <Skeleton className="h-14 w-14 rounded-xl" />
            <Skeleton className="h-6 w-2/3" />
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-10 w-full" />
          </div>
        ) : error && !preview ? (
          <>
            <ScreenHeading title={error.title} subtitle={error.message} />
            <div className="flex flex-col gap-3">
              <Button onClick={() => void loadPreview()}>Повторить</Button>
              <Button variant="ghost" onClick={() => router.replace("/login")}>
                На главную
              </Button>
            </div>
          </>
        ) : preview && !firebaseUser ? (
          <>
            <ScreenHeading
              title="Приглашение в команду"
              subtitle={`${preview.companyName} приглашает вас присоединиться`}
            />
            <InviteCompanyCard preview={preview} />
            <div className="flex flex-col gap-2">
              <Button onClick={() => router.push(`/login?invite=${encodeURIComponent(token)}`)}>
                Войти
              </Button>
              <Button
                variant="outline"
                onClick={() => router.push(`/login?mode=signup&invite=${encodeURIComponent(token)}`)}
              >
                Создать аккаунт
              </Button>
            </div>
          </>
        ) : preview && emailMismatch ? (
          <>
            <ScreenHeading title="Другой аккаунт" subtitle="Приглашение отправлено на другой email" />
            <Alert>
              <AlertTitle>Приглашение для</AlertTitle>
              <AlertDescription>{preview.email}</AlertDescription>
            </Alert>
            <Alert>
              <AlertTitle>Вы вошли как</AlertTitle>
              <AlertDescription>{userEmail}</AlertDescription>
            </Alert>
            <div className="flex flex-col gap-2">
              <Button variant="outline" onClick={() => void handleAccept(false)} disabled={busy}>
                {busy ? <Loader2 className="size-4 animate-spin" /> : "Продолжить с текущим аккаунтом"}
              </Button>
              <Button variant="ghost" onClick={() => void logout()}>
                Сменить аккаунт
              </Button>
            </div>
          </>
        ) : preview && busy && preview.canAccept && !emailMismatch ? (
          <>
            <ScreenHeading
              title="Приглашение в команду"
              subtitle="Присоединяем к команде…"
            />
            <InviteCompanyCard preview={preview} />
            <div className="flex justify-center py-2">
              <Loader2 className="size-5 animate-spin text-muted-foreground" />
            </div>
          </>
        ) : preview ? (
          <>
            <ScreenHeading
              title="Приглашение в команду"
              subtitle={
                preview.canAccept ? "Примите приглашение, чтобы присоединиться" : "Приглашение недоступно"
              }
            />
            <InviteCompanyCard preview={preview} />
            {error ? (
              <Alert variant="destructive">
                <AlertTitle>{error.title}</AlertTitle>
                <AlertDescription>{error.message}</AlertDescription>
              </Alert>
            ) : null}
            <div className="flex flex-col gap-2">
              {preview.canAccept ? (
                <>
                  <Button onClick={() => void handleAccept(true)} disabled={busy}>
                    {busy ? <Loader2 className="size-4 animate-spin" /> : "Принять и перейти"}
                  </Button>
                  <Button variant="outline" onClick={() => void handleAccept(false)} disabled={busy}>
                    Принять без переключения
                  </Button>
                  <Button variant="ghost" onClick={() => void handleDecline()} disabled={busy}>
                    Отклонить
                  </Button>
                </>
              ) : (
                <Button onClick={() => router.replace("/")}>На главную</Button>
              )}
            </div>
          </>
        ) : null}
      </div>
    </AuthJourneyShell>
  );
}

function ScreenHeading({ title, subtitle }: { title: string; subtitle: string }) {
  return (
    <div className="space-y-2 text-center">
      <h1 className="text-2xl font-semibold tracking-tight">{title}</h1>
      <p className="text-sm text-muted-foreground">{subtitle}</p>
    </div>
  );
}

function InviteCompanyCard({ preview }: { preview: InvitePreview }) {
  return (
    <div
      className={cn(
        "rounded-2xl border border-border/60 bg-card p-5 shadow-sm",
        "flex flex-col gap-4",
      )}
    >
      <div className="flex items-center gap-3">
        <CompanyAvatar companyId={preview.companyId} name={preview.companyName} size="md" />
        <div>
          <p className="text-base font-semibold text-foreground">{preview.companyName}</p>
          <p className="text-sm text-muted-foreground">
            Роль: {ROLE_LABELS[preview.role] ?? preview.role}
          </p>
        </div>
      </div>
      {preview.inviterName ? (
        <p className="text-sm text-muted-foreground">Пригласил: {preview.inviterName}</p>
      ) : null}
      {preview.email ? (
        <p className="text-sm text-muted-foreground">Email: {preview.email}</p>
      ) : null}
    </div>
  );
}
