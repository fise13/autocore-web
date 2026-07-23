"use client";

import Link from "next/link";
import { FormEvent, useEffect, useRef, useState } from "react";
import { useSearchParams } from "next/navigation";
import { AnimatePresence, motion } from "motion/react";
import { AtSign, ChevronLeft, Loader2 } from "lucide-react";

import { AppleIcon, GoogleIcon } from "@/components/auth/auth-brand-icons";
import { AuthDivider } from "@/components/auth/auth-divider";
import { AuthJourneyReveal } from "@/components/auth/auth-journey-reveal";
import { AuthJourneyShell } from "@/components/auth/auth-journey-shell";
import { PasswordField } from "@/components/auth/password-field";
import { PasswordStrengthField } from "@/components/auth/password-strength-field";
import { ProfileNameFields } from "@/components/auth/profile-name-fields";
import { useAuth } from "@/components/providers/auth-provider";
import { AppLoadingScreen } from "@/components/ui/app-loading-screen";
import { Button, buttonVariants } from "@/components/ui/button";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
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
import { marketingRoute } from "@/lib/marketing-routes";
import { marketingHomeUrl, marketingPageUrl } from "@/lib/site-urls";
import {
  readPendingMarketingCheckout,
  storePendingMarketingCheckout,
} from "@/lib/marketing/pending-checkout";
import {
  readBillingIntentFromSearchParams,
  storePendingBillingIntent,
} from "@/lib/marketing/pending-billing-intent";
import {
  readInviteCompanyName,
  readInviteEmail,
  readInviteToken,
  storePendingInvite,
} from "@/lib/invites/pending-invite";
import { prefersReducedMotion } from "@/lib/motion/cross-route-transition";
import { cn } from "@/lib/utils";
import { getActiveUserCopyLocale, mapAuthError, userCopy } from "@/lib/user-copy";

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
  const searchParams = useSearchParams();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [paidCheckoutPending, setPaidCheckoutPending] = useState(false);
  const [emailStep, setEmailStep] = useState(false);
  const [emailMode, setEmailMode] = useState<EmailSignInMode>("login");
  const [oauthProviders, setOauthProviders] = useState<Array<"google.com" | "apple.com">>([]);
  const [resetSent, setResetSent] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [authPhase, setAuthPhase] = useState<AuthPhase>("idle");
  const [pendingAuth, setPendingAuth] = useState<PendingAuth>(null);
  const [authStepDirection, setAuthStepDirection] = useState(1);
  const [authStepAnimated, setAuthStepAnimated] = useState(false);
  const [inviteCompanyName, setInviteCompanyName] = useState<string | null>(null);
  const [inviteFlowActive, setInviteFlowActive] = useState(false);
  const inviteBootstrapRef = useRef(false);

  const isBusy = authPhase !== "idle";
  const isInviteFlow = inviteFlowActive || Boolean(inviteCompanyName) || Boolean(searchParams.get("invite")?.trim());
  const inviteBootstrapping = isInviteFlow && authPhase === "detecting" && !emailStep;
  const appleSetupIssue = isAppleJsAuthMode() ? getAppleJsSetupIssue() : null;
  const copy = userCopy.auth.login;
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

  useEffect(() => {
    const checkout = searchParams.get("checkout");
    const sessionId = searchParams.get("session_id")?.trim();
    const interval = searchParams.get("interval");
    if (checkout === "success" && sessionId) {
      storePendingMarketingCheckout({
        sessionId,
        interval: interval === "yearly" ? "yearly" : "monthly",
      });
      setPaidCheckoutPending(true);
    } else {
      setPaidCheckoutPending(Boolean(readPendingMarketingCheckout()));
    }

    const billingIntent = readBillingIntentFromSearchParams(searchParams);
    if (billingIntent) {
      storePendingBillingIntent(billingIntent);
    }
  }, [searchParams]);

  useEffect(() => {
    if (inviteBootstrapRef.current) return;

    const tokenFromUrl = searchParams.get("invite")?.trim() ?? "";
    const token = tokenFromUrl || readInviteToken() || "";
    const pendingInviteEmail = readInviteEmail();

    if (!token && !pendingInviteEmail) return;
    inviteBootstrapRef.current = true;
    setInviteFlowActive(true);

    let cancelled = false;
    async function bootstrapInviteLogin() {
      setError(null);
      setResetSent(false);
      setAuthPhase("detecting");

      try {
        let inviteEmail = pendingInviteEmail;
        let companyName = readInviteCompanyName();

        if (token) {
          storePendingInvite({ token });
          if (!inviteEmail || !companyName) {
            const response = await fetch(`/api/invites/${encodeURIComponent(token)}`);
            const payload = (await response.json()) as {
              preview?: { email?: string | null; companyName?: string };
            };
            if (response.ok && payload.preview) {
              inviteEmail =
                (typeof payload.preview.email === "string" ? payload.preview.email : null) ??
                inviteEmail;
              companyName = payload.preview.companyName?.trim() || companyName;
              storePendingInvite({
                token,
                email: inviteEmail ?? undefined,
                companyName: companyName ?? undefined,
              });
            }
          }
        }

        if (cancelled) return;

        if (!inviteEmail?.trim()) {
          setAuthPhase("idle");
          return;
        }

        setEmail(inviteEmail);
        setInviteCompanyName(companyName);

        const methods = await resolveSignInMethodsForEmail(inviteEmail);
        if (cancelled) return;

        const resolved = resolveEmailSignInMode(methods);
        const forcedSignup = searchParams.get("mode") === "signup";
        setAuthStepDirection(1);
        setAuthStepAnimated(true);
        setEmailMode(forcedSignup ? "signup" : resolved.mode);
        setOauthProviders(resolved.oauthProviders);
        setEmailStep(true);
      } catch (e) {
        if (!cancelled) {
          setError(mapAuthError(e));
        }
      } finally {
        if (!cancelled) {
          setAuthPhase("idle");
        }
      }
    }

    void bootstrapInviteLogin();
    return () => {
      cancelled = true;
    };
  }, [resolveSignInMethodsForEmail, searchParams]);

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
      setError(copy.enterEmail);
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
      const forcedSignup = searchParams.get("mode") === "signup";
      setEmailMode(forcedSignup ? "signup" : resolved.mode);
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
    if (!email.trim()) {
      setError(copy.enterEmail);
      return;
    }
    if (isSignUp) {
      const passwordError = validateSignupPassword(password);
      if (passwordError) {
        setError(passwordError);
        return;
      }
      if (!firstName.trim() || !lastName.trim()) {
        setError(copy.enterName);
        return;
      }
    } else if (password.length < 6) {
      setError(copy.passwordTooShort);
      return;
    }
    await runAuth(async () => {
      try {
        if (isSignUp) {
          await signUpWithEmail(email.trim(), password, {
            firstName: firstName.trim(),
            lastName: lastName.trim(),
          });
        } else {
          await signInWithEmail(email.trim(), password);
        }
      } catch (authError) {
        const message = mapAuthError(authError);
        if (
          isSignUp &&
          (message.includes("уже зарегистрирован") || message.includes("already registered"))
        ) {
          setEmailMode("login");
          throw new Error(copy.emailAlreadyRegistered);
        }
        if (
          !isSignUp &&
          (message.includes("Неверный email или пароль") ||
            message.includes("Incorrect email or password") ||
            /wrong.?password|user-not-found|invalid-credential/i.test(message))
        ) {
          const methods = await resolveSignInMethodsForEmail(email);
          if (methods.length === 0) {
            setEmailMode("signup");
            throw new Error(copy.emailNotRegistered);
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
    setFirstName("");
    setLastName("");
    setError(null);
    setResetSent(false);
  }

  async function onForgotPassword() {
    if (!email.trim()) {
      setError(copy.enterEmail);
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
    return (
      <AuthJourneyShell stepKey="completing" stepLabel={copy.stepLabel} contentWidth="md">
        <div className="flex flex-col items-center gap-4 py-10 text-center">
          <Loader2 className="size-6 animate-spin text-primary motion-reduce:animate-none" aria-hidden />
          <p className="text-sm font-medium text-foreground">{userCopy.auth.completing}</p>
        </div>
      </AuthJourneyShell>
    );
  }

  const loginStepKey = emailStep ? `email-${emailMode}` : "entry";

  return (
    <AuthJourneyShell
      stepKey={loginStepKey}
      stepLabel={copy.stepLabel}
      contentWidth="sm"
      topLeft={
        <Link
          href={marketingHomeUrl()}
          className={buttonVariants({ variant: "ghost", size: "sm" })}
        >
          <ChevronLeft className="size-4" data-icon="inline-start" aria-hidden />
          {copy.backHome}
        </Link>
      }
    >
      <div className="space-y-4">
        <div className="flex flex-col space-y-1">
          <AuthJourneyReveal index={0} as="h1" className="text-2xl font-bold tracking-tight">
            {isInviteFlow && emailStep && isSignUp
              ? copy.titleInviteSignup
              : isInviteFlow && emailStep
                ? copy.titleInviteLogin
                : copy.title}
          </AuthJourneyReveal>
          <AuthJourneyReveal index={1} as="p" className="text-base text-muted-foreground">
            {isInviteFlow && emailStep
              ? isSignUp
                ? copy.inviteSignupHint
                : copy.inviteLoginHint
              : isInviteFlow
                ? copy.inviteLoading
                : copy.subtitle}
          </AuthJourneyReveal>
        </div>

        {paidCheckoutPending ? (
          <AuthJourneyReveal index={2}>
            <Alert>
              <AlertTitle>{copy.paidCheckoutTitle}</AlertTitle>
              <AlertDescription>{copy.paidCheckoutDescription}</AlertDescription>
            </Alert>
          </AuthJourneyReveal>
        ) : null}

        {inviteBootstrapping ? (
          <div className="flex items-center justify-center gap-2 py-10 text-sm text-muted-foreground">
            <Loader2 className="size-4 animate-spin motion-reduce:animate-none" aria-hidden />
            {copy.inviteLoading}
          </div>
        ) : (
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
                <AuthJourneyReveal index={paidCheckoutPending ? 3 : 2}>
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
                </AuthJourneyReveal>
                <AuthJourneyReveal index={paidCheckoutPending ? 4 : 3}>
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
                </AuthJourneyReveal>
                {appleSetupIssue ? (
                  <p className="text-xs text-destructive">{appleSetupIssue}</p>
                ) : null}
              </div>

              <AuthJourneyReveal index={paidCheckoutPending ? 5 : 4}>
                <AuthDivider>{copy.or}</AuthDivider>
              </AuthJourneyReveal>

              <AuthJourneyReveal index={paidCheckoutPending ? 6 : 5}>
              <form className="space-y-2" onSubmit={onEmailContinue} autoComplete="on">
                <p className="text-start text-xs text-muted-foreground">
                  {copy.emailLabel}
                </p>
                <InputGroup>
                  <InputGroupInput
                    id="auth-email-entry"
                    name="email"
                    placeholder={copy.emailPlaceholder}
                    type="email"
                    autoComplete="username email"
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
                      {copy.checkingEmail}
                    </span>
                  ) : (
                    copy.continueEmail
                  )}
                </Button>

                <button
                  type="button"
                  className="w-full text-sm text-muted-foreground underline underline-offset-4 transition-colors hover:text-foreground disabled:opacity-50"
                  disabled={isBusy}
                  onClick={() => void onForgotPassword()}
                >
                  {userCopy.auth.forgotPassword}
                </button>

                {resetSent ? (
                  <p className="text-center text-sm text-muted-foreground">
                    {copy.resetSentTo(email)}
                  </p>
                ) : null}
              </form>
              </AuthJourneyReveal>
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
                  {copy.changeEmail}
                </button>
              </div>
              {isInviteFlow ? (
                <InviteFormNotice companyName={inviteCompanyName} />
              ) : null}
              <p className="text-sm text-muted-foreground">
                {copy.oauthOnly.replace(
                  "{providers}",
                  [
                    oauthProviders.includes("google.com") ? copy.oauthGoogle : null,
                    oauthProviders.includes("apple.com") ? copy.oauthApple : null,
                  ]
                    .filter(Boolean)
                    .join(copy.oauthOr),
                )}
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
            <form className="space-y-3" onSubmit={onPasswordSubmit} autoComplete="on">
              <div className="flex flex-col gap-1.5">
                <div className="flex items-center justify-between gap-2">
                  <label htmlFor="auth-email" className="text-xs text-muted-foreground">
                    Email
                  </label>
                  <button
                    type="button"
                    className="text-xs text-primary underline underline-offset-4 transition-opacity hover:opacity-80"
                    disabled={isBusy || isInviteFlow}
                    onClick={changeEmail}
                  >
                    {copy.back}
                  </button>
                </div>
                <InputGroup>
                  <InputGroupInput
                    id="auth-email"
                    name="email"
                    placeholder={copy.emailPlaceholder}
                    type="email"
                    autoComplete="username email"
                    value={email}
                    onChange={(event) => setEmail(event.target.value)}
                    required
                    disabled={isBusy || isInviteFlow}
                    readOnly={isInviteFlow}
                  />
                  <InputGroupAddon align="inline-start">
                    <AtSign className="size-4" aria-hidden />
                  </InputGroupAddon>
                </InputGroup>
              </div>

              {isInviteFlow ? (
                <InviteFormNotice companyName={inviteCompanyName} />
              ) : null}

              {isSignUp ? (
                <motion.div
                  initial={reducedMotion ? false : { opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.24, ease: authStepEase, delay: 0.04 }}
                >
                  <ProfileNameFields
                    firstName={firstName}
                    lastName={lastName}
                    onFirstNameChange={setFirstName}
                    onLastNameChange={setLastName}
                    disabled={isBusy}
                    firstNameId="signup-first-name"
                    lastNameId="signup-last-name"
                  />
                </motion.div>
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
                  label={copy.passwordLabel}
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
                  {userCopy.auth.forgotPassword}
                </button>
              ) : null}

              {resetSent ? (
                <p className="text-center text-sm text-muted-foreground">
                  {copy.resetSentTo(email)}
                </p>
              ) : null}
            </form>
            </motion.div>
          )}
          </AnimatePresence>
        )}

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
            {copy.legalPrefix}{" "}
            <Link
              href={marketingPageUrl(marketingRoute("terms", getActiveUserCopyLocale()))}
              className="underline underline-offset-4 hover:text-primary"
            >
              {copy.terms}
            </Link>{" "}
            {copy.legalAnd}{" "}
            <Link
              href={marketingPageUrl(marketingRoute("privacy", getActiveUserCopyLocale()))}
              className="underline underline-offset-4 hover:text-primary"
            >
              {copy.privacy}
            </Link>
            {copy.legalSuffix}
          </p>
      </div>
    </AuthJourneyShell>
  );
}

function InviteFormNotice({ companyName }: { companyName: string | null }) {
  const copy = userCopy.auth.login;
  return (
    <p className="rounded-lg border border-primary/15 bg-primary/5 px-3 py-2.5 text-sm leading-relaxed text-muted-foreground">
      {companyName ? copy.inviteBannerNamed(companyName) : copy.inviteBannerGeneric}
    </p>
  );
}
