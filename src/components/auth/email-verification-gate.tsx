"use client";

import { ReactNode, useEffect, useRef, useState } from "react";
import { Loader2, MailCheck } from "lucide-react";

import { AppLogo } from "@/components/brand/app-logo";
import { useAuth } from "@/components/providers/auth-provider";
import { AppLoadingScreen } from "@/components/ui/app-loading-screen";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { getAccountProviderInfo } from "@/lib/auth/account-info";
import { hasEmailVerificationComplete } from "@/lib/performance/session-flags";
import { userCopy } from "@/lib/user-copy";
import { cn } from "@/lib/utils";

type EmailVerificationGateProps = {
  children: ReactNode;
};

function normalizeCode(value: string): string {
  return value.replace(/\D/g, "").slice(0, 6);
}

export function EmailVerificationGate({ children }: EmailVerificationGateProps) {
  const { firebaseUser, isLoading, sendEmailVerification, verifyEmailWithCode, logout } = useAuth();
  const [status, setStatus] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [code, setCode] = useState("");
  const autoSentRef = useRef(false);
  const verifyAttemptRef = useRef<string | null>(null);

  const provider = firebaseUser ? getAccountProviderInfo(firebaseUser) : null;
  const needsVerification =
    Boolean(firebaseUser) &&
    provider?.kind === "email" &&
    !firebaseUser?.emailVerified &&
    !hasEmailVerificationComplete(firebaseUser?.uid ?? "");

  useEffect(() => {
    if (!needsVerification || autoSentRef.current) return;
    autoSentRef.current = true;
    void sendEmailVerification()
      .then(() => setStatus(userCopy.auth.verifyEmailAutoSent))
      .catch((sendError) => {
        const message = sendError instanceof Error ? sendError.message : "";
        if (message.includes("Подождите")) {
          setStatus(userCopy.auth.verifyEmailAutoSent);
          return;
        }
        autoSentRef.current = false;
        setError(message || "Не удалось отправить код.");
      });
  }, [needsVerification, sendEmailVerification]);

  useEffect(() => {
    if (!needsVerification || code.length !== 6) return;
    if (verifyAttemptRef.current === code) return;
    verifyAttemptRef.current = code;

    let cancelled = false;
    setBusy(true);
    setError(null);
    setStatus(userCopy.auth.verifyEmailCodeWorking);

    void verifyEmailWithCode(code)
      .then((verified) => {
        if (cancelled) return;
        if (verified) {
          setStatus(userCopy.auth.verifyEmailSuccess);
          return;
        }
        setStatus(userCopy.auth.verifyEmailNotYet);
        verifyAttemptRef.current = null;
      })
      .catch((verifyError) => {
        if (cancelled) return;
        setError(
          verifyError instanceof Error
            ? verifyError.message
            : userCopy.auth.verifyEmailCodeInvalid,
        );
        setStatus(null);
        verifyAttemptRef.current = null;
      })
      .finally(() => {
        if (!cancelled) setBusy(false);
      });

    return () => {
      cancelled = true;
    };
  }, [code, needsVerification, verifyEmailWithCode]);

  if (isLoading || !firebaseUser) {
    return <AppLoadingScreen message={userCopy.auth.loading} />;
  }

  if (!needsVerification) {
    return <>{children}</>;
  }

  async function onResend() {
    setBusy(true);
    setError(null);
    setStatus(null);
    setCode("");
    verifyAttemptRef.current = null;
    try {
      await sendEmailVerification();
      setStatus(userCopy.auth.verifyEmailResent);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Не удалось отправить код.");
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
        <Card className="overflow-hidden border-border/80 shadow-xl shadow-black/5">
          <div className="h-1 bg-gradient-to-r from-primary via-primary/80 to-sky-400" />
          <CardHeader className="text-center">
            <div className="mx-auto mb-3 flex size-14 items-center justify-center rounded-2xl bg-primary/10 text-primary ring-1 ring-primary/15">
              {busy ? (
                <Loader2 className="size-6 animate-spin" aria-hidden />
              ) : (
                <MailCheck className="size-6" aria-hidden />
              )}
            </div>
            <CardTitle className="text-2xl tracking-tight">{userCopy.auth.verifyEmailTitle}</CardTitle>
            <CardDescription className="text-base leading-relaxed">
              {userCopy.auth.verifyEmailDescription}{" "}
              <span className="font-medium text-foreground">{firebaseUser.email}</span>.
              <span className="mt-2 block">{userCopy.auth.verifyEmailCodeHint}</span>
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <label htmlFor="email-verification-code" className="sr-only">
                Код подтверждения
              </label>
              <Input
                id="email-verification-code"
                inputMode="numeric"
                autoComplete="one-time-code"
                pattern="[0-9]*"
                maxLength={6}
                value={code}
                disabled={busy}
                placeholder="000000"
                onChange={(event) => {
                  setError(null);
                  setStatus(null);
                  setCode(normalizeCode(event.target.value));
                }}
                className={cn(
                  "h-14 text-center text-2xl font-semibold tracking-[0.45em] tabular-nums",
                  busy && "opacity-70",
                )}
              />
            </div>
            <Button
              type="button"
              variant="outline"
              className="h-11 w-full"
              disabled={busy}
              onClick={() => void onResend()}
            >
              Отправить код повторно
            </Button>
            <Button
              type="button"
              variant="ghost"
              className="w-full"
              disabled={busy}
              onClick={() => void logout()}
            >
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
