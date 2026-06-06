"use client";

import { FormEvent, useEffect, useState } from "react";
import { Loader2 } from "lucide-react";

import { GoogleIcon } from "@/components/auth/auth-brand-icons";
import { useAuth } from "@/components/providers/auth-provider";
import { AppLogo } from "@/components/brand/app-logo";
import { AppLoadingScreen } from "@/components/ui/app-loading-screen";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { logAuthDebug } from "@/lib/auth/auth-debug";
import { getFirebaseAuth } from "@/infrastructure/firebase/client";
import { mapAuthError, userCopy } from "@/lib/user-copy";
import { cn } from "@/lib/utils";

type LoginStage = "entry" | "signIn" | "signUp";
type AuthPhase = "idle" | "submitting" | "completing";
type PendingAuth = "google" | "email" | null;

type LoginScreenProps = {
  onAuthenticated?: () => void;
  bootstrapError?: string | null;
};

export function LoginScreen({ onAuthenticated, bootstrapError = null }: LoginScreenProps = {}) {
  const { signInWithEmail, signInWithGoogle, signUpWithEmail } = useAuth();
  const [stage, setStage] = useState<LoginStage>("entry");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [authPhase, setAuthPhase] = useState<AuthPhase>("idle");
  const [pendingAuth, setPendingAuth] = useState<PendingAuth>(null);

  const isBusy = authPhase !== "idle";

  useEffect(() => {
    if (bootstrapError) {
      setError(bootstrapError);
    }
  }, [bootstrapError]);

  async function runAuth(action: () => Promise<void>, provider: PendingAuth) {
    logAuthDebug("login-screen", "runAuth start", { provider });
    setAuthPhase("submitting");
    setPendingAuth(provider);
    setError(null);
    try {
      await action();
      await getFirebaseAuth().authStateReady();
      const currentUser = getFirebaseAuth().currentUser;
      logAuthDebug("login-screen", "runAuth after action", {
        provider,
        currentUser: currentUser?.uid ?? null,
      });
      if (!currentUser) {
        throw new Error("Вход не завершён. Попробуйте ещё раз.");
      }
      setAuthPhase("completing");
      onAuthenticated?.();
    } catch (e) {
      logAuthDebug("login-screen", "runAuth error", e);
      setAuthPhase("idle");
      setPendingAuth(null);
      setError(mapAuthError(e));
    }
  }

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (password.length < 6) {
      setError("Пароль слишком короткий (минимум 6 символов).");
      return;
    }
    await runAuth(async () => {
      if (stage === "signUp") {
        await signUpWithEmail(email, password);
      } else {
        await signInWithEmail(email, password);
      }
    }, "email");
  }

  if (authPhase === "completing") {
    return <AppLoadingScreen message={userCopy.auth.completing} />;
  }

  return (
    <div className="relative flex min-h-screen items-center justify-center overflow-hidden bg-background p-4">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_20%_20%,rgba(59,130,246,0.12),transparent_45%),radial-gradient(circle_at_80%_0%,rgba(16,185,129,0.1),transparent_40%)]" />
      <div className="relative w-full max-w-md animate-autocore-auth-card-enter rounded-2xl border bg-card/95 p-6 shadow-xl backdrop-blur-sm motion-reduce:animate-none">
        <div className="mb-6 flex flex-col items-center gap-3 text-center">
          <AppLogo
            size={96}
            className="animate-autocore-logo-enter motion-reduce:animate-none"
            priority
          />
          <div className="animate-autocore-fade-in-up motion-reduce:animate-none [animation-delay:80ms]">
            <h1 className="text-2xl font-semibold tracking-tight">{userCopy.appName}</h1>
            <p className="text-sm text-muted-foreground">{userCopy.auth.subtitle}</p>
          </div>
        </div>

        <div
          className={cn(
            "space-y-3 transition-all duration-300",
            stage === "entry" ? "block" : "hidden",
          )}
        >
          <button
            type="button"
            disabled={isBusy}
            onClick={() => runAuth(() => signInWithGoogle(), "google")}
            className="auth-oauth-button auth-oauth-button-google animate-autocore-auth-stagger motion-reduce:animate-none [animation-delay:120ms]"
          >
            {pendingAuth === "google" ? (
              <Loader2 className="size-5 animate-spin text-muted-foreground" aria-hidden="true" />
            ) : (
              <GoogleIcon className="size-5" />
            )}
            {userCopy.auth.signInGoogle}
          </button>
          <Button
            type="button"
            className="h-11 w-full animate-autocore-auth-stagger motion-reduce:animate-none [animation-delay:210ms]"
            disabled={isBusy}
            onClick={() => setStage("signUp")}
          >
            {userCopy.auth.signUp}
          </Button>
          <Button
            type="button"
            variant="outline"
            className="h-11 w-full animate-autocore-auth-stagger motion-reduce:animate-none [animation-delay:270ms]"
            disabled={isBusy}
            onClick={() => setStage("signIn")}
          >
            {userCopy.auth.signIn}
          </Button>
        </div>

        {(stage === "signIn" || stage === "signUp") && (
          <form
            key={stage}
            className="animate-autocore-auth-form-enter space-y-3 motion-reduce:animate-none"
            onSubmit={onSubmit}
          >
            <div className="space-y-1">
              <Label htmlFor="email">{userCopy.account.emailLabel}</Label>
              <Input
                id="email"
                type="email"
                autoComplete="email"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                required
                disabled={isBusy}
              />
            </div>
            <div className="space-y-1">
              <Label htmlFor="password">Пароль</Label>
              <Input
                id="password"
                type="password"
                autoComplete={stage === "signUp" ? "new-password" : "current-password"}
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                required
                minLength={6}
                disabled={isBusy}
              />
            </div>
            <Button type="submit" disabled={isBusy} className="h-11 w-full">
              {pendingAuth === "email" ? (
                <>
                  <Loader2 className="size-4 animate-spin" aria-hidden="true" />
                  {stage === "signUp" ? userCopy.auth.creatingAccount : userCopy.auth.signingIn}
                </>
              ) : stage === "signUp" ? (
                userCopy.auth.createAccount
              ) : (
                userCopy.auth.signInEmail
              )}
            </Button>
            <button
              type="button"
              className="w-full text-sm text-muted-foreground underline underline-offset-4 transition-colors hover:text-foreground disabled:opacity-50"
              disabled={isBusy}
              onClick={() => setStage(stage === "signUp" ? "signIn" : "signUp")}
            >
              {stage === "signUp" ? userCopy.auth.haveAccount : userCopy.auth.noAccount}
            </button>
            <button
              type="button"
              className="w-full text-sm text-muted-foreground transition-colors hover:text-foreground disabled:opacity-50"
              disabled={isBusy}
              onClick={() => setStage("entry")}
            >
              ← Назад
            </button>
          </form>
        )}

        {error ? (
          <p className="mt-4 animate-shake text-sm text-destructive whitespace-pre-wrap motion-reduce:animate-none">
            {error}
          </p>
        ) : null}
      </div>
    </div>
  );
}
