"use client";

import Link from "next/link";
import { FormEvent, useEffect, useState } from "react";
import { AtSign, ChevronLeft, Loader2 } from "lucide-react";

import { AppleIcon, GoogleIcon } from "@/components/auth/auth-brand-icons";
import { AuthDivider } from "@/components/auth/auth-divider";
import { FloatingPaths } from "@/components/auth/floating-paths";
import { useAuth } from "@/components/providers/auth-provider";
import { AppLogo } from "@/components/brand/app-logo";
import { AppLoadingScreen } from "@/components/ui/app-loading-screen";
import { Button, buttonVariants } from "@/components/ui/button";
import { InputGroup, InputGroupAddon, InputGroupInput } from "@/components/ui/input-group";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { formatAppleAuthErrorForUi, logAppleAuthError } from "@/lib/auth/apple-auth-log";
import { isAppleJsAuthMode } from "@/lib/auth/apple-auth-mode";
import { APPLE_DOMAIN_SETUP_STEPS, isAppleDomainAssociationLive } from "@/lib/auth/apple-domain-health";
import { getAppleJsLoginRedirectUri, getAppleJsSetupIssue } from "@/lib/auth/apple-js-setup";
import { isAppleUserCancellationError, normalizeAppleJsError } from "@/lib/auth/apple-js-sign-in";
import { logAuthDebug } from "@/lib/auth/auth-debug";
import { getFirebaseAuth } from "@/infrastructure/firebase/client";
import { marketingRoutes } from "@/lib/marketing-routes";
import { mapAuthError, userCopy } from "@/lib/user-copy";

type AuthPhase = "idle" | "submitting" | "completing";
type PendingAuth = "google" | "apple" | "email" | null;

type LoginScreenProps = {
  onAuthenticated?: () => void;
  bootstrapError?: string | null;
};

export function LoginScreen({ onAuthenticated, bootstrapError = null }: LoginScreenProps = {}) {
  const { signInWithEmail, signInWithGoogle, signInWithApple, signUpWithEmail } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [emailStep, setEmailStep] = useState(false);
  const [isSignUp, setIsSignUp] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [authPhase, setAuthPhase] = useState<AuthPhase>("idle");
  const [pendingAuth, setPendingAuth] = useState<PendingAuth>(null);

  const [appleDomainLive, setAppleDomainLive] = useState<boolean | null>(null);

  const isBusy = authPhase !== "idle";
  const appleSetupIssue = isAppleJsAuthMode() ? getAppleJsSetupIssue() : null;
  const appleRedirectUri = isAppleJsAuthMode() ? getAppleJsLoginRedirectUri() : null;

  useEffect(() => {
    if (!isAppleJsAuthMode()) return;
    void isAppleDomainAssociationLive().then(setAppleDomainLive);
  }, []);

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
        // signInWithRedirect (Apple on mobile) — page will navigate away.
        return;
      }
      setAuthPhase("completing");
      onAuthenticated?.();
    } catch (e) {
      logAuthDebug("login-screen", "runAuth error", e);
      const isAppleCancel = provider === "apple" && isAppleUserCancellationError(e);
      if (provider === "apple" && !isAppleCancel) {
        logAppleAuthError("login-screen:runAuth", e);
      }
      setAuthPhase("idle");
      setPendingAuth(null);
      if (isAppleCancel) {
        return;
      }
      setError(
        provider === "apple"
          ? formatAppleAuthErrorForUi(normalizeAppleJsError(e))
          : mapAuthError(e),
      );
    }
  }

  function onEmailContinue(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!email.trim()) {
      setError("Введите email.");
      return;
    }
    setError(null);
    setEmailStep(true);
  }

  async function onPasswordSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (password.length < 6) {
      setError("Пароль слишком короткий (минимум 6 символов).");
      return;
    }
    await runAuth(async () => {
      if (isSignUp) {
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
    <main
      data-login-screen
      className="relative md:h-screen md:overflow-hidden lg:grid lg:grid-cols-2"
    >
      <div
        data-page-reveal
        className="relative hidden h-full flex-col border-r border-border bg-secondary p-10 lg:flex dark:bg-secondary/20"
      >
        <div className="absolute inset-0 bg-gradient-to-b from-transparent via-transparent to-background" />
        <AppLogo size={28} className="relative z-10 mr-auto h-7 w-auto" priority />

        <div className="relative z-10 mt-auto">
          <blockquote className="space-y-2">
            <p className="text-xl leading-relaxed">
              &ldquo;AutoCore помогает закрывать наряды быстрее — склад, цех и бухгалтерия наконец
              говорят на одном языке.&rdquo;
            </p>
            <footer className="font-mono text-sm font-semibold">~ Команда AutoCore</footer>
          </blockquote>
        </div>

        <div className="absolute inset-0">
          <FloatingPaths position={1} />
          <FloatingPaths position={-1} />
        </div>
      </div>

      <div
        data-page-reveal
        className="relative flex min-h-screen flex-col justify-center px-8"
      >
        <div
          aria-hidden
          className="absolute inset-0 isolate -z-10 opacity-60 contain-strict"
        >
          <div className="absolute top-0 right-0 h-80 w-56 -translate-y-1/2 rounded-full bg-[radial-gradient(68.54%_68.72%_at_55.02%_31.46%,color-mix(in_srgb,var(--foreground)_6%,transparent)_0,color-mix(in_srgb,var(--foreground)_2%,transparent)_50%,transparent_80%)]" />
          <div className="absolute top-0 right-0 h-80 w-40 translate-x-[5%] -translate-y-1/2 rounded-full bg-[radial-gradient(50%_50%_at_50%_50%,color-mix(in_srgb,var(--foreground)_4%,transparent)_0,transparent_80%)]" />
        </div>

        <Link
          href={marketingRoutes.home}
          className={buttonVariants({ variant: "ghost", size: "sm", className: "absolute top-7 left-5" })}
        >
          <ChevronLeft className="size-4" data-icon="inline-start" aria-hidden />
          На главную
        </Link>

        <div className="mx-auto w-full space-y-4 sm:max-w-sm">
          <AppLogo size={28} className="h-7 w-auto lg:hidden" priority />

          <div className="flex flex-col space-y-1">
            <h1 className="text-2xl font-bold tracking-wide">Войти или создать аккаунт</h1>
            <p className="text-base text-muted-foreground">
              Вход в {userCopy.appName} или регистрация новой команды.
            </p>
          </div>

          {!emailStep ? (
            <>
              <div className="space-y-2">
                <Button
                  type="button"
                  className="h-10 w-full"
                  disabled={isBusy}
                  onClick={() => runAuth(() => signInWithGoogle(), "google")}
                >
                  {pendingAuth === "google" ? (
                    <Loader2 className="size-4 animate-spin" data-icon="inline-start" aria-hidden />
                  ) : (
                    <GoogleIcon className="size-4" data-icon="inline-start" />
                  )}
                  {userCopy.auth.signInGoogle}
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  className="h-10 w-full"
                  disabled={isBusy || Boolean(appleSetupIssue)}
                  onClick={() => {
                    if (appleSetupIssue) {
                      setError(appleSetupIssue);
                      return;
                    }
                    void runAuth(() => signInWithApple(), "apple");
                  }}
                >
                  {pendingAuth === "apple" ? (
                    <Loader2 className="size-4 animate-spin" data-icon="inline-start" aria-hidden />
                  ) : (
                    <AppleIcon className="size-4" data-icon="inline-start" />
                  )}
                  {userCopy.auth.signInApple}
                </Button>
                {appleSetupIssue ? (
                  <p className="text-xs text-destructive">{appleSetupIssue}</p>
                ) : appleDomainLive === false ? (
                  <div className="rounded-lg border border-destructive/40 bg-destructive/5 p-3 text-xs leading-relaxed text-destructive">
                    <p className="font-semibold">Apple Sign-In: домен не верифицирован (404)</p>
                    <p className="mt-1 text-destructive/90">
                      Пока не загружен файл{" "}
                      <span className="font-mono">/.well-known/apple-developer-domain-association</span>, Apple
                      показывает «Регистрация не выполнена». Сейчас используется запасной вход через Firebase OAuth.
                    </p>
                    <pre className="mt-2 whitespace-pre-wrap font-mono text-[10px] text-destructive/80">
                      {APPLE_DOMAIN_SETUP_STEPS}
                    </pre>
                  </div>
                ) : appleRedirectUri ? (
                  <p className="text-[11px] leading-snug text-muted-foreground">
                    Apple Return URL: <span className="font-mono">{appleRedirectUri}</span>
                  </p>
                ) : null}
              </div>

              <AuthDivider>ИЛИ</AuthDivider>

              <form className="space-y-2" onSubmit={onEmailContinue}>
                <p className="text-start text-xs text-muted-foreground">
                  Email для входа или создания аккаунта
                </p>
                <InputGroup>
                  <InputGroupInput
                    placeholder="your.email@example.com"
                    type="email"
                    autoComplete="email"
                    value={email}
                    onChange={(event) => setEmail(event.target.value)}
                    required
                    disabled={isBusy}
                  />
                  <InputGroupAddon align="inline-start">
                    <AtSign className="size-4" aria-hidden />
                  </InputGroupAddon>
                </InputGroup>

                <Button className="h-10 w-full" type="submit" disabled={isBusy}>
                  Продолжить с email
                </Button>
              </form>
            </>
          ) : (
            <form className="animate-autocore-auth-form-enter space-y-3 motion-reduce:animate-none" onSubmit={onPasswordSubmit}>
              <div className="rounded-lg border border-border bg-muted/30 px-3 py-2 text-sm">
                <span className="text-muted-foreground">Email: </span>
                <span className="font-medium">{email}</span>
                <button
                  type="button"
                  className="ml-2 text-xs text-primary underline underline-offset-4"
                  disabled={isBusy}
                  onClick={() => {
                    setEmailStep(false);
                    setPassword("");
                    setError(null);
                  }}
                >
                  Изменить
                </button>
              </div>

              <div className="space-y-1">
                <Label htmlFor="password">Пароль</Label>
                <Input
                  id="password"
                  type="password"
                  autoComplete={isSignUp ? "new-password" : "current-password"}
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                  required
                  minLength={6}
                  disabled={isBusy}
                  className="h-10"
                />
              </div>

              <Button type="submit" disabled={isBusy} className="h-10 w-full">
                {pendingAuth === "email" ? (
                  <>
                    <Loader2 className="size-4 animate-spin" aria-hidden />
                    {isSignUp ? userCopy.auth.creatingAccount : userCopy.auth.signingIn}
                  </>
                ) : isSignUp ? (
                  userCopy.auth.createAccount
                ) : (
                  userCopy.auth.signInEmail
                )}
              </Button>

              <button
                type="button"
                className="w-full text-sm text-muted-foreground underline underline-offset-4 transition-colors hover:text-foreground disabled:opacity-50"
                disabled={isBusy}
                onClick={() => setIsSignUp((value) => !value)}
              >
                {isSignUp ? userCopy.auth.haveAccount : userCopy.auth.noAccount}
              </button>
            </form>
          )}

          {error ? (
            <p className="animate-shake text-sm whitespace-pre-wrap text-destructive motion-reduce:animate-none">
              {error}
            </p>
          ) : null}

          <p className="mt-8 text-sm text-muted-foreground">
            Нажимая «Продолжить», вы соглашаетесь с{" "}
            <Link
              href={marketingRoutes.terms}
              className="underline underline-offset-4 hover:text-primary"
            >
              Условиями использования
            </Link>{" "}
            и{" "}
            <Link
              href={marketingRoutes.privacy}
              className="underline underline-offset-4 hover:text-primary"
            >
              Политикой конфиденциальности
            </Link>
            .
          </p>
        </div>
      </div>
    </main>
  );
}
