"use client";

import Link from "next/link";
import { FormEvent, useEffect, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { AtSign, ChevronLeft, Loader2 } from "lucide-react";

import { AppleIcon, GoogleIcon } from "@/components/auth/auth-brand-icons";
import { AuthDivider } from "@/components/auth/auth-divider";
import { FloatingPaths } from "@/components/auth/floating-paths";
import { PasswordField } from "@/components/auth/password-field";
import { PasswordStrengthField } from "@/components/auth/password-strength-field";
import { useAuth } from "@/components/providers/auth-provider";
import { AppLogo } from "@/components/brand/app-logo";
import { AppLoadingScreen } from "@/components/ui/app-loading-screen";
import { Button, buttonVariants } from "@/components/ui/button";
import { InputGroup, InputGroupAddon, InputGroupInput } from "@/components/ui/input-group";
import { formatAppleAuthErrorForUi, logAppleAuthError } from "@/lib/auth/apple-auth-log";
import { isAppleJsAuthMode } from "@/lib/auth/apple-auth-mode";
import { getAppleJsSetupIssue } from "@/lib/auth/apple-js-setup";
import { isAppleUserCancellationError, normalizeAppleJsError } from "@/lib/auth/apple-js-sign-in";
import { logAuthDebug } from "@/lib/auth/auth-debug";
import { validateSignupPassword } from "@/lib/auth/password-validation";
import {
  EmailSignInMode,
  resolveEmailSignInMode,
} from "@/lib/auth/resolve-email-sign-in-mode";
import { getFirebaseAuth } from "@/infrastructure/firebase/client";
import { marketingRoutes } from "@/lib/marketing-routes";
import { marketingHomeUrl, marketingPageUrl } from "@/lib/site-urls";
import { prefersReducedMotion } from "@/lib/motion/cross-route-transition";
import { cn } from "@/lib/utils";
import { mapAuthError, userCopy } from "@/lib/user-copy";

const authStepEase = [0.22, 1, 0.36, 1] as const;

type AuthPhase = "idle" | "submitting" | "completing" | "detecting";
type PendingAuth = "google" | "apple" | "email" | null;

type LoginScreenProps = {
  onAuthenticated?: () => void;
  bootstrapError?: string | null;
};

export function LoginScreen({ onAuthenticated, bootstrapError = null }: LoginScreenProps = {}) {
  const {
    signInWithEmail,
    signInWithGoogle,
    signInWithApple,
    signUpWithEmail,
    resolveSignInMethodsForEmail,
    sendPasswordResetForEmail,
  } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [emailStep, setEmailStep] = useState(false);
  const [emailMode, setEmailMode] = useState<EmailSignInMode>("login");
  const [oauthProviders, setOauthProviders] = useState<Array<"google.com" | "apple.com">>([]);
  const [resetSent, setResetSent] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [authPhase, setAuthPhase] = useState<AuthPhase>("idle");
  const [pendingAuth, setPendingAuth] = useState<PendingAuth>(null);
  const [authStepDirection, setAuthStepDirection] = useState(1);
  const [authStepAnimated, setAuthStepAnimated] = useState(false);

  const isBusy = authPhase !== "idle";
  const appleSetupIssue = isAppleJsAuthMode() ? getAppleJsSetupIssue() : null;
  const isSignUp = emailMode === "signup";
  const reducedMotion = prefersReducedMotion();
  const authStepInitial =
    authStepAnimated && !reducedMotion
      ? { opacity: 0, x: authStepDirection * 24 }
      : false;

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

  async function onEmailContinue(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!email.trim()) {
      setError("Введите email.");
      return;
    }
    setError(null);
    setResetSent(false);
    setAuthPhase("detecting");
    try {
      const methods = await resolveSignInMethodsForEmail(email);
      const resolved = resolveEmailSignInMode(methods);
      setAuthStepDirection(1);
      setAuthStepAnimated(true);
      setEmailMode(resolved.mode);
      setOauthProviders(resolved.oauthProviders);
      setEmailStep(true);
    } catch (e) {
      setError(mapAuthError(e));
    } finally {
      setAuthPhase("idle");
    }
  }

  async function onPasswordSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (isSignUp) {
      const passwordError = validateSignupPassword(password);
      if (passwordError) {
        setError(passwordError);
        return;
      }
    } else if (password.length < 6) {
      setError("Пароль слишком короткий (минимум 6 символов).");
      return;
    }
    await runAuth(async () => {
      try {
        if (isSignUp) {
          await signUpWithEmail(email, password);
        } else {
          await signInWithEmail(email, password);
        }
      } catch (authError) {
        const message = mapAuthError(authError);
        if (isSignUp && message.includes("уже зарегистрирован")) {
          setEmailMode("login");
          throw new Error("Этот email уже зарегистрирован. Введите пароль для входа.");
        }
        if (!isSignUp && message.includes("Неверный email или пароль")) {
          const methods = await resolveSignInMethodsForEmail(email);
          if (methods.length === 0) {
            setEmailMode("signup");
            throw new Error("Аккаунта с этим email нет. Придумайте пароль для регистрации.");
          }
        }
        throw authError;
      }
    }, "email");
  }

  function changeEmail() {
    setAuthStepDirection(-1);
    setAuthStepAnimated(true);
    setEmailStep(false);
    setPassword("");
    setError(null);
    setResetSent(false);
  }

  async function onForgotPassword() {
    if (!email.trim()) {
      setError("Введите email.");
      return;
    }
    setError(null);
    setAuthPhase("submitting");
    try {
      await sendPasswordResetForEmail(email);
      setResetSent(true);
    } catch (e) {
      setError(mapAuthError(e));
    } finally {
      setAuthPhase("idle");
    }
  }

  useEffect(() => {
    if (authPhase !== "completing") return;
    const timer = window.setTimeout(() => {
      window.location.assign("/");
    }, 5000);
    return () => window.clearTimeout(timer);
  }, [authPhase]);

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

      <div data-page-reveal className="relative flex min-h-screen flex-col justify-center px-8">
        <div aria-hidden className="absolute inset-0 isolate -z-10 opacity-60 contain-strict">
          <div className="absolute top-0 right-0 h-80 w-56 -translate-y-1/2 rounded-full bg-[radial-gradient(68.54%_68.72%_at_55.02%_31.46%,color-mix(in_srgb,var(--foreground)_6%,transparent)_0,color-mix(in_srgb,var(--foreground)_2%,transparent)_50%,transparent_80%)]" />
          <div className="absolute top-0 right-0 h-80 w-40 translate-x-[5%] -translate-y-1/2 rounded-full bg-[radial-gradient(50%_50%_at_50%_50%,color-mix(in_srgb,var(--foreground)_4%,transparent)_0,transparent_80%)]" />
        </div>

        <Link
          href={marketingHomeUrl()}
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

          <AnimatePresence mode="wait" custom={authStepDirection}>
          {!emailStep ? (
            <motion.div
              key="email-entry"
              custom={authStepDirection}
              initial={authStepInitial}
              animate={{ opacity: 1, x: 0 }}
              exit={reducedMotion ? undefined : { opacity: 0, x: authStepDirection * -24 }}
              transition={{ duration: 0.28, ease: authStepEase }}
              className="space-y-4"
            >
              <div className="space-y-2">
                <Button
                  type="button"
                  className="auth-oauth-button auth-oauth-button-google h-10 w-full"
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
                  className="auth-oauth-button auth-oauth-button-apple h-10 w-full"
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
                ) : null}
              </div>

              <AuthDivider>ИЛИ</AuthDivider>

              <form className="space-y-2" onSubmit={onEmailContinue}>
                <p className="text-start text-xs text-muted-foreground">
                  Email для входа или создания аккаунта
                </p>
                <InputGroup>
                  <InputGroupInput
                    placeholder="ваш@email.ru"
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

                <Button
                  className={cn(
                    "h-10 w-full transition-all duration-300",
                    authPhase === "detecting" && "pointer-events-none",
                  )}
                  type="submit"
                  disabled={isBusy}
                >
                  {authPhase === "detecting" ? (
                    <span className="flex items-center justify-center gap-2">
                      <span className="relative flex size-4 items-center justify-center">
                        <span className="absolute inset-0 animate-ping rounded-full bg-primary/25 motion-reduce:animate-none" />
                        <Loader2 className="relative size-4 animate-spin" aria-hidden />
                      </span>
                      Проверяем email…
                    </span>
                  ) : (
                    "Продолжить с email"
                  )}
                </Button>
              </form>
            </motion.div>
          ) : emailMode === "oauth" ? (
            <motion.div
              key="oauth"
              custom={authStepDirection}
              initial={authStepInitial}
              animate={{ opacity: 1, x: 0 }}
              exit={reducedMotion ? undefined : { opacity: 0, x: authStepDirection * -24 }}
              transition={{ duration: 0.28, ease: authStepEase }}
              className="space-y-3"
            >
              <div className="rounded-lg border border-border bg-muted/30 px-3 py-2 text-sm">
                <span className="text-muted-foreground">Email: </span>
                <span className="font-medium">{email}</span>
                <button
                  type="button"
                  className="ml-2 text-xs text-primary underline underline-offset-4 transition-opacity hover:opacity-80"
                  disabled={isBusy}
                  onClick={changeEmail}
                >
                  Изменить
                </button>
              </div>
              <p className="text-sm text-muted-foreground">
                Этот email зарегистрирован через{" "}
                {oauthProviders.includes("google.com") ? "Google" : "Apple"}
                {oauthProviders.length > 1 ? " или Apple" : ""}. Войдите тем же способом.
              </p>
              <div className="space-y-2">
                {oauthProviders.includes("google.com") ? (
                  <Button
                    type="button"
                    className="auth-oauth-button auth-oauth-button-google h-10 w-full"
                    disabled={isBusy}
                    onClick={() => runAuth(() => signInWithGoogle(), "google")}
                  >
                    {userCopy.auth.signInGoogle}
                  </Button>
                ) : null}
                {oauthProviders.includes("apple.com") ? (
                  <Button
                    type="button"
                    variant="outline"
                    className="auth-oauth-button auth-oauth-button-apple h-10 w-full"
                    disabled={isBusy || Boolean(appleSetupIssue)}
                    onClick={() => void runAuth(() => signInWithApple(), "apple")}
                  >
                    {userCopy.auth.signInApple}
                  </Button>
                ) : null}
              </div>
            </motion.div>
          ) : (
            <motion.div
              key={isSignUp ? "signup" : "login"}
              custom={authStepDirection}
              initial={authStepInitial}
              animate={{ opacity: 1, x: 0 }}
              exit={reducedMotion ? undefined : { opacity: 0, x: authStepDirection * -24 }}
              transition={{ duration: 0.28, ease: authStepEase }}
            >
            <form className="space-y-3" onSubmit={onPasswordSubmit}>
              <div className="rounded-lg border border-border bg-muted/30 px-3 py-2 text-sm">
                <span className="text-muted-foreground">Email: </span>
                <span className="font-medium">{email}</span>
                <button
                  type="button"
                  className="ml-2 text-xs text-primary underline underline-offset-4 transition-opacity hover:opacity-80"
                  disabled={isBusy}
                  onClick={changeEmail}
                >
                  Изменить
                </button>
              </div>

              {!isSignUp ? (
                <p className="text-sm text-muted-foreground">
                  Аккаунт найден — введите пароль для входа.
                </p>
              ) : null}

              {isSignUp ? (
                <PasswordStrengthField
                  id="password"
                  value={password}
                  onChange={setPassword}
                  disabled={isBusy}
                />
              ) : (
                <PasswordField
                  id="password"
                  label="Пароль"
                  value={password}
                  onChange={setPassword}
                  autoComplete="current-password"
                  disabled={isBusy}
                />
              )}

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

              {!isSignUp ? (
                <button
                  type="button"
                  className="w-full text-sm text-muted-foreground underline underline-offset-4 transition-colors hover:text-foreground disabled:opacity-50"
                  disabled={isBusy}
                  onClick={() => void onForgotPassword()}
                >
                  Забыли пароль?
                </button>
              ) : null}

              {resetSent ? (
                <p className="text-center text-sm text-muted-foreground">
                  Ссылка для сброса пароля отправлена на {email}.
                </p>
              ) : null}
            </form>
            </motion.div>
          )}
          </AnimatePresence>

          {error ? (
            <p
              role="alert"
              aria-live="assertive"
              className="animate-shake text-sm whitespace-pre-wrap text-destructive motion-reduce:animate-none"
            >
              {error}
            </p>
          ) : null}

          <p className="mt-8 text-sm text-muted-foreground">
            Нажимая «Продолжить», вы соглашаетесь с{" "}
            <Link
              href={marketingPageUrl(marketingRoutes.terms)}
              className="underline underline-offset-4 hover:text-primary"
            >
              Условиями использования
            </Link>{" "}
            и{" "}
            <Link
              href={marketingPageUrl(marketingRoutes.privacy)}
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
