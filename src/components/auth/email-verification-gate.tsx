"use client";

import { ReactNode, useState } from "react";
import { Loader2, MailCheck } from "lucide-react";

import { AppLogo } from "@/components/brand/app-logo";
import { useAuth } from "@/components/providers/auth-provider";
import { AppLoadingScreen } from "@/components/ui/app-loading-screen";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { getAccountProviderInfo } from "@/lib/auth/account-info";
import { userCopy } from "@/lib/user-copy";

type EmailVerificationGateProps = {
  children: ReactNode;
};

export function EmailVerificationGate({ children }: EmailVerificationGateProps) {
  const { firebaseUser, isLoading, sendEmailVerification, reloadFirebaseUser, logout } = useAuth();
  const [status, setStatus] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  if (isLoading || !firebaseUser) {
    return <AppLoadingScreen message={userCopy.auth.loading} />;
  }

  const provider = getAccountProviderInfo(firebaseUser);
  const needsVerification = provider?.kind === "email" && !firebaseUser.emailVerified;

  if (!needsVerification) {
    return <>{children}</>;
  }

  async function onResend() {
    setBusy(true);
    setError(null);
    setStatus(null);
    try {
      await sendEmailVerification();
      setStatus("Письмо отправлено. Проверьте почту и папку «Спам».");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Не удалось отправить письмо.");
    } finally {
      setBusy(false);
    }
  }

  async function onCheckVerified() {
    setBusy(true);
    setError(null);
    setStatus(null);
    try {
      const verified = await reloadFirebaseUser();
      if (!verified) {
        setStatus("Email ещё не подтверждён. Откройте ссылку из письма и нажмите снова.");
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : "Не удалось обновить статус.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-muted/20 p-4">
      <div className="w-full max-w-md space-y-6">
        <div className="flex justify-center">
          <AppLogo size={40} />
        </div>
        <Card>
          <CardHeader className="text-center">
            <div className="mx-auto mb-2 flex size-12 items-center justify-center rounded-full bg-primary/10 text-primary">
              <MailCheck className="size-6" aria-hidden />
            </div>
            <CardTitle>Подтвердите email</CardTitle>
            <CardDescription>
              Мы отправили письмо на{" "}
              <span className="font-medium text-foreground">{firebaseUser.email}</span>. Откройте
              ссылку, чтобы продолжить.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <Button type="button" className="w-full" disabled={busy} onClick={() => void onCheckVerified()}>
              {busy ? <Loader2 className="size-4 animate-spin" aria-hidden /> : null}
              Я подтвердил email
            </Button>
            <Button type="button" variant="outline" className="w-full" disabled={busy} onClick={() => void onResend()}>
              Отправить повторно
            </Button>
            <Button type="button" variant="ghost" className="w-full" disabled={busy} onClick={() => void logout()}>
              Выйти
            </Button>
            {status ? <p className="text-center text-sm text-muted-foreground">{status}</p> : null}
            {error ? (
              <p role="alert" className="text-center text-sm text-destructive">
                {error}
              </p>
            ) : null}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
