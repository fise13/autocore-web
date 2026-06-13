"use client";

import { FormEvent, Suspense, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { applyActionCode, confirmPasswordReset, getAuth } from "firebase/auth";
import {
  ArrowRight,
  CheckCircle2,
  ChevronLeft,
  KeyRound,
  Loader2,
  MailCheck,
  ShieldAlert,
} from "lucide-react";

import { FloatingPaths } from "@/components/auth/floating-paths";
import { AppLogo } from "@/components/brand/app-logo";
import { FirebaseConfigRequired } from "@/components/firebase/firebase-config-required";
import { Button, buttonVariants } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { getFirebaseAuth, isFirebaseConfigured } from "@/infrastructure/firebase/client";
import { marketingHomeUrl } from "@/lib/site-urls";
import { cn } from "@/lib/utils";
import { mapAuthError, userCopy } from "@/lib/user-copy";

type ActionMode = "verifyEmail" | "resetPassword" | "recoverEmail" | "unknown";
type ActionStatus = "idle" | "working" | "success" | "error";

function resolveMode(value: string | null): ActionMode {
  if (value === "verifyEmail" || value === "resetPassword" || value === "recoverEmail") {
    return value;
  }
  return "unknown";
}

function AuthActionBackdrop() {
  return (
    <>
      <div aria-hidden className="pointer-events-none absolute inset-0 -z-10 opacity-60">
        <div className="absolute top-0 right-0 h-80 w-56 -translate-y-1/2 rounded-full bg-[radial-gradient(68.54%_68.72%_at_55.02%_31.46%,color-mix(in_srgb,var(--primary)_10%,transparent)_0,color-mix(in_srgb,var(--primary)_3%,transparent)_50%,transparent_80%)]" />
        <div className="absolute bottom-0 left-0 h-72 w-72 translate-y-1/3 rounded-full bg-[radial-gradient(50%_50%_at_50%_50%,color-mix(in_srgb,var(--primary)_8%,transparent)_0,transparent_80%)]" />
      </div>
      <div className="pointer-events-none absolute inset-0 -z-10 hidden lg:block">
        <FloatingPaths position={1} />
        <FloatingPaths position={-1} />
      </div>
    </>
  );
}

function AuthActionContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const mode = resolveMode(searchParams.get("mode"));
  const oobCode = searchParams.get("oobCode") ?? "";
  const [status, setStatus] = useState<ActionStatus>("idle");
  const [message, setMessage] = useState<string | null>(null);
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  const isReady = useMemo(() => Boolean(oobCode), [oobCode]);

  useEffect(() => {
    if (!isFirebaseConfigured() || !isReady || mode !== "verifyEmail") return;

    let cancelled = false;
    setStatus("working");
    setMessage(null);

    void (async () => {
      try {
        const auth = getFirebaseAuth();
        await applyActionCode(auth, oobCode);
        if (cancelled) return;
        const current = auth.currentUser;
        if (current) {
          await current.reload();
        }
        setStatus("success");
        setMessage(userCopy.auth.verifyEmailSuccess);
        window.setTimeout(() => router.replace("/"), 2200);
      } catch (error) {
        if (cancelled) return;
        setStatus("error");
        setMessage(mapAuthError(error));
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [isReady, mode, oobCode, router]);

  async function onResetPassword(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (password.length < 6) {
      setMessage("Пароль слишком короткий (минимум 6 символов).");
      return;
    }
    if (password !== confirmPassword) {
      setMessage("Пароли не совпадают.");
      return;
    }

    setStatus("working");
    setMessage(null);
    try {
      const auth = getAuth(getFirebaseAuth().app);
      await confirmPasswordReset(auth, oobCode, password);
      setStatus("success");
      setMessage(userCopy.auth.passwordResetSuccess);
      window.setTimeout(() => router.replace("/login?reset=success"), 2200);
    } catch (error) {
      setStatus("error");
      setMessage(mapAuthError(error));
    }
  }

  if (!isFirebaseConfigured()) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background p-4">
        <FirebaseConfigRequired />
      </div>
    );
  }

  if (!isReady || mode === "unknown") {
    return (
      <AuthActionShell
        status="error"
        icon={<ShieldAlert className="size-6" aria-hidden />}
        title="Ссылка недействительна"
        description="Запросите новое письмо и попробуйте снова."
        actionLabel="На страницу входа"
        onAction={() => router.replace("/login")}
      />
    );
  }

  if (mode === "verifyEmail") {
    return (
      <AuthActionShell
        status={status}
        icon={
          status === "success" ? (
            <CheckCircle2 className="size-6" aria-hidden />
          ) : status === "error" ? (
            <ShieldAlert className="size-6" aria-hidden />
          ) : (
            <MailCheck className="size-6" aria-hidden />
          )
        }
        title={
          status === "success"
            ? userCopy.auth.verifyEmailSuccessTitle
            : status === "error"
              ? "Не удалось подтвердить email"
              : userCopy.auth.verifyEmailTitle
        }
        description={
          status === "working"
            ? userCopy.auth.verifyEmailWorking
            : message ?? userCopy.auth.verifyEmailWorking
        }
        actionLabel={
          status === "success"
            ? "Открываем приложение…"
            : status === "error"
              ? "На страницу входа"
              : "Подтверждаем…"
        }
        onAction={() => router.replace(status === "success" ? "/" : "/login")}
        busy={status === "working" || status === "success"}
        hideAction={status === "working"}
      />
    );
  }

  if (mode === "resetPassword") {
    return (
      <div className="relative flex min-h-screen flex-col justify-center px-4 py-10">
        <AuthActionBackdrop />
        <Link
          href={marketingHomeUrl()}
          className={buttonVariants({ variant: "ghost", size: "sm", className: "absolute top-7 left-5" })}
        >
          <ChevronLeft className="size-4" data-icon="inline-start" aria-hidden />
          На главную
        </Link>
        <div className="mx-auto w-full max-w-md space-y-6">
          <div className="flex justify-center">
            <AppLogo size={32} className="h-8 w-auto" />
          </div>
          <Card className="border-border/80 shadow-xl shadow-black/5">
            <CardHeader className="text-center">
              <div className="mx-auto mb-3 flex size-14 items-center justify-center rounded-2xl bg-primary/10 text-primary ring-1 ring-primary/15">
                <KeyRound className="size-6" aria-hidden />
              </div>
              <CardTitle className="text-2xl tracking-tight">{userCopy.auth.passwordResetTitle}</CardTitle>
              <CardDescription className="text-base">{userCopy.auth.passwordResetDescription}</CardDescription>
            </CardHeader>
            <CardContent>
              {status === "success" ? (
                <p className="text-center text-sm text-muted-foreground">{message}</p>
              ) : (
                <form className="space-y-4" onSubmit={onResetPassword}>
                  <div className="space-y-2">
                    <Label htmlFor="new-password">{userCopy.auth.passwordResetNew}</Label>
                    <Input
                      id="new-password"
                      type="password"
                      autoComplete="new-password"
                      value={password}
                      onChange={(event) => setPassword(event.target.value)}
                      disabled={status === "working"}
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="confirm-password">{userCopy.auth.passwordResetConfirm}</Label>
                    <Input
                      id="confirm-password"
                      type="password"
                      autoComplete="new-password"
                      value={confirmPassword}
                      onChange={(event) => setConfirmPassword(event.target.value)}
                      disabled={status === "working"}
                      required
                    />
                  </div>
                  {message ? (
                    <p
                      role={status === "error" ? "alert" : "status"}
                      className={`text-sm ${status === "error" ? "text-destructive" : "text-muted-foreground"}`}
                    >
                      {message}
                    </p>
                  ) : null}
                  <Button type="submit" className="h-11 w-full" disabled={status === "working"}>
                    {status === "working" ? <Loader2 className="size-4 animate-spin" aria-hidden /> : null}
                    {userCopy.auth.passwordResetSubmit}
                  </Button>
                </form>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <AuthActionShell
      status="error"
      icon={<ShieldAlert className="size-6" aria-hidden />}
      title="Операция не поддерживается"
      description="Откройте ссылку из письма AutoCore или запросите новую."
      actionLabel="На страницу входа"
      onAction={() => router.replace("/login")}
    />
  );
}

type AuthActionShellProps = {
  icon: React.ReactNode;
  title: string;
  description: string;
  actionLabel: string;
  onAction: () => void;
  status?: ActionStatus;
  busy?: boolean;
  hideAction?: boolean;
};

function AuthActionShell({
  icon,
  title,
  description,
  actionLabel,
  onAction,
  status = "idle",
  busy = false,
  hideAction = false,
}: AuthActionShellProps) {
  const iconTone =
    status === "success"
      ? "bg-emerald-500/10 text-emerald-600 ring-emerald-500/20"
      : status === "error"
        ? "bg-destructive/10 text-destructive ring-destructive/20"
        : "bg-primary/10 text-primary ring-primary/15";

  return (
    <div className="relative flex min-h-screen flex-col justify-center px-4 py-10">
      <AuthActionBackdrop />
      <Link
        href={marketingHomeUrl()}
        className={buttonVariants({ variant: "ghost", size: "sm", className: "absolute top-7 left-5" })}
      >
        <ChevronLeft className="size-4" data-icon="inline-start" aria-hidden />
        На главную
      </Link>
      <div className="mx-auto w-full max-w-md space-y-6">
        <div className="flex justify-center">
          <AppLogo size={32} className="h-8 w-auto" />
        </div>
        <Card className="overflow-hidden border-border/80 shadow-xl shadow-black/5">
          <div className="h-1 bg-gradient-to-r from-primary via-primary/80 to-sky-400" />
          <CardHeader className="space-y-4 text-center">
            <div
              className={cn(
                "mx-auto flex size-14 items-center justify-center rounded-2xl ring-1",
                iconTone,
              )}
            >
              {busy && status !== "success" ? (
                <Loader2 className="size-6 animate-spin" aria-hidden />
              ) : (
                icon
              )}
            </div>
            <div className="space-y-2">
              <CardTitle className="text-2xl tracking-tight">{title}</CardTitle>
              <CardDescription className="text-base leading-relaxed">{description}</CardDescription>
            </div>
          </CardHeader>
          {!hideAction ? (
            <CardContent>
              <Button
                type="button"
                className="h-11 w-full"
                disabled={busy}
                onClick={onAction}
              >
                {busy ? <Loader2 className="size-4 animate-spin" aria-hidden /> : null}
                {actionLabel}
                {status === "success" ? <ArrowRight className="size-4" data-icon="inline-end" aria-hidden /> : null}
              </Button>
            </CardContent>
          ) : (
            <CardContent className="pb-8">
              <div className="mx-auto h-1.5 w-32 overflow-hidden rounded-full bg-muted">
                <div className="h-full w-1/2 animate-pulse rounded-full bg-primary" />
              </div>
            </CardContent>
          )}
        </Card>
      </div>
    </div>
  );
}

export default function AuthActionPage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-screen items-center justify-center text-sm text-muted-foreground">
          Загрузка…
        </div>
      }
    >
      <AuthActionContent />
    </Suspense>
  );
}
