"use client";

import { FormEvent, useEffect, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Laptop, Loader2, Users } from "lucide-react";

import { AuthJourneyReveal } from "@/components/auth/auth-journey-reveal";
import { useAuth } from "@/components/providers/auth-provider";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { clearInviteToken, readInviteToken } from "@/lib/invites/pending-invite";
import { authJourneyPanelTransition } from "@/lib/motion/auth-journey-motion";
import { prefersReducedMotion } from "@/lib/motion/cross-route-transition";
import { mapAuthError, userCopy } from "@/lib/user-copy";
import { cn } from "@/lib/utils";

export function CompanyOnboardingStep() {
  const { createCompany, joinCompanyWithInvite, joinCompanyWithInviteToken, ensureDefaultCompany } = useAuth();
  const [companyName, setCompanyName] = useState("");
  const [inviteCode, setInviteCode] = useState("");
  const [showInvite, setShowInvite] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitMessage, setSubmitMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const pendingInviteAttempted = useRef(false);
  const reducedMotion = prefersReducedMotion();

  useEffect(() => {
    if (pendingInviteAttempted.current) return;
    const token = readInviteToken();
    if (!token) return;
    pendingInviteAttempted.current = true;
    setIsSubmitting(true);
    setSubmitMessage("Присоединение по приглашению…");
    setError(null);
    void joinCompanyWithInviteToken(token)
      .then(() => clearInviteToken())
      .catch((e) => {
        setError(mapAuthError(e, { surface: "onboarding" }));
        setIsSubmitting(false);
        setSubmitMessage(null);
        setShowInvite(true);
      });
  }, [joinCompanyWithInviteToken]);

  async function runAction(action: () => Promise<void>, message: string) {
    setIsSubmitting(true);
    setSubmitMessage(message);
    setError(null);
    try {
      await action();
    } catch (e) {
      setError(mapAuthError(e, { surface: "onboarding" }));
      setIsSubmitting(false);
      setSubmitMessage(null);
    }
  }

  async function onCreateCompany(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!companyName.trim()) return;
    await runAction(async () => {
      await createCompany(companyName.trim());
      setCompanyName("");
    }, "Создание компании…");
  }

  async function onJoinCompany(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!inviteCode.trim()) return;
    await runAction(async () => {
      await joinCompanyWithInvite(inviteCode.trim());
      setInviteCode("");
    }, "Присоединение к компании…");
  }

  if (isSubmitting) {
    return (
      <motion.div
        initial={reducedMotion ? false : { opacity: 0, scale: 0.98 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={authJourneyPanelTransition}
        className="flex flex-col items-center gap-4 py-10 text-center"
      >
        <Loader2 className="size-6 animate-spin text-primary motion-reduce:animate-none" aria-hidden />
        <div className="space-y-1">
          <p className="text-sm font-medium">{submitMessage ?? userCopy.auth.completing}</p>
          <p className="text-xs text-muted-foreground">Это займёт несколько секунд</p>
        </div>
      </motion.div>
    );
  }

  return (
    <div className="mx-auto flex w-full max-w-md flex-col gap-8 text-center">
      <div className="space-y-2">
        <AuthJourneyReveal index={0} as="h1" className="text-2xl font-semibold tracking-tight sm:text-3xl">
          {userCopy.company.welcomeTitle}
        </AuthJourneyReveal>
        <AuthJourneyReveal index={1} as="p" className="text-sm text-muted-foreground">
          {userCopy.company.welcomeDescription}
        </AuthJourneyReveal>
      </div>

      <div className="space-y-6 text-left">
        <AuthJourneyReveal index={2} className="space-y-4">
          <div className="flex items-start gap-3">
            <div className="flex size-10 shrink-0 items-center justify-center rounded-xl border border-border/60 bg-muted/15">
              <Laptop className="size-4 text-primary" aria-hidden />
            </div>
            <div className="space-y-1">
              <p className="font-medium">{userCopy.company.macQuestion}</p>
              <p className="text-sm text-muted-foreground">{userCopy.company.macDescription}</p>
            </div>
          </div>
          <Button
            type="button"
            className="h-11 w-full"
            onClick={() => runAction(() => ensureDefaultCompany(), "Подключение данных…")}
          >
            {userCopy.company.macButton}
          </Button>
        </AuthJourneyReveal>

        <div className="h-px bg-border/60" />

        <AuthJourneyReveal index={3} className="space-y-4">
          <div className="space-y-1">
            <p className="font-medium">{userCopy.company.newTeamTitle}</p>
            <p className="text-sm text-muted-foreground">{userCopy.company.newTeamDescription}</p>
          </div>
          <form onSubmit={onCreateCompany} className="space-y-3">
            <div className="space-y-1.5">
              <Label htmlFor="companyName">{userCopy.company.companyNameLabel}</Label>
              <Input
                id="companyName"
                value={companyName}
                onChange={(event) => setCompanyName(event.target.value)}
                placeholder={userCopy.company.companyNamePlaceholder}
                required
              />
            </div>
            <Button type="submit" variant="secondary" className="h-11 w-full">
              {userCopy.company.createButton}
            </Button>
          </form>
        </AuthJourneyReveal>
      </div>

      <AuthJourneyReveal index={4}>
        <button
          type="button"
          className="cursor-pointer text-sm text-muted-foreground underline-offset-4 transition-colors duration-200 hover:text-foreground hover:underline"
          onClick={() => setShowInvite((current) => !current)}
        >
          {userCopy.company.inviteLink}
        </button>
      </AuthJourneyReveal>

      <AnimatePresence initial={false}>
        {showInvite ? (
          <motion.div
            key="invite"
            initial={reducedMotion ? false : { opacity: 0, height: 0, y: -8 }}
            animate={{ opacity: 1, height: "auto", y: 0 }}
            exit={reducedMotion ? { opacity: 0 } : { opacity: 0, height: 0, y: -8 }}
            transition={authJourneyPanelTransition}
            className="overflow-hidden text-left"
          >
            <AuthJourneyReveal index={0} className="space-y-4 border-t border-border/60 pt-6">
              <div className="flex items-start gap-3">
                <div className="flex size-9 shrink-0 items-center justify-center rounded-xl border border-border/60 bg-muted/15">
                  <Users className="size-4 text-muted-foreground" aria-hidden />
                </div>
                <div className="space-y-1">
                  <p className="font-medium">{userCopy.company.inviteTitle}</p>
                  <p className="text-sm text-muted-foreground">{userCopy.company.inviteDescription}</p>
                </div>
              </div>
              <form onSubmit={onJoinCompany} className="space-y-3">
                <div className="space-y-1.5">
                  <Label htmlFor="inviteCode">{userCopy.company.inviteLabel}</Label>
                  <Input
                    id="inviteCode"
                    value={inviteCode}
                    onChange={(event) => setInviteCode(event.target.value)}
                    placeholder="Например: DUAVV5"
                    required
                  />
                </div>
                <Button type="submit" variant="outline" className="h-11 w-full">
                  Присоединиться
                </Button>
              </form>
            </AuthJourneyReveal>
          </motion.div>
        ) : null}
      </AnimatePresence>

      <AnimatePresence initial={false}>
        {error ? (
          <motion.p
            key={error}
            role="alert"
            initial={reducedMotion ? false : { opacity: 0, y: 4 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            className={cn("text-center text-sm text-destructive")}
          >
            {error}
          </motion.p>
        ) : null}
      </AnimatePresence>
    </div>
  );
}
