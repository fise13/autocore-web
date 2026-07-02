"use client";

import { FormEvent, useEffect, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Loader2, MailCheck } from "lucide-react";

import { AuthJourneyReveal } from "@/components/auth/auth-journey-reveal";
import {
  AuthJourneyStepBody,
  AuthJourneyStepCard,
  AuthJourneyStepHeader,
  AuthJourneySuccessCard,
} from "@/components/auth/auth-journey-step-card";
import { VerificationCodeInput } from "@/components/auth/verification-code-input";
import { useAuth } from "@/components/providers/auth-provider";
import { Button } from "@/components/ui/button";
import {
  authJourneyPanelTransition,
  authJourneyQuickTransition,
  authJourneySuccessVariants,
} from "@/lib/motion/auth-journey-motion";
import { prefersReducedMotion } from "@/lib/motion/cross-route-transition";
import { userCopy } from "@/lib/user-copy";

type Phase = "input" | "success";

type EmailVerificationStepProps = {
  onVerified?: () => void;
};

export function EmailVerificationStep({ onVerified }: EmailVerificationStepProps) {
  const { firebaseUser, sendEmailVerification, verifyEmailWithCode, reloadFirebaseUser, logout } =
    useAuth();
  const [phase, setPhase] = useState<Phase>("input");
  const [status, setStatus] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [code, setCode] = useState("");
  const autoSentRef = useRef(false);
  const verifyAttemptRef = useRef<string | null>(null);
  const reducedMotion = prefersReducedMotion();

  useEffect(() => {
    if (autoSentRef.current) return;
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
  }, [sendEmailVerification]);

  useEffect(() => {
    if (code.length !== 6) return;
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
          setPhase("success");
          setStatus(userCopy.auth.verifyEmailSuccess);
          window.setTimeout(() => onVerified?.(), 420);
          return;
        }
        setStatus(userCopy.auth.verifyEmailNotYet);
        verifyAttemptRef.current = null;
      })
      .catch((verifyError) => {
        if (cancelled) return;
        setError(
          verifyError instanceof Error ? verifyError.message : userCopy.auth.verifyEmailCodeInvalid,
        );
        setStatus(null);
        verifyAttemptRef.current = null;
        setCode("");
      })
      .finally(() => {
        if (!cancelled) setBusy(false);
      });

    return () => {
      cancelled = true;
    };
  }, [code, onVerified, verifyEmailWithCode]);

  useEffect(() => {
    if (phase !== "success") return;

    let cancelled = false;
    let attempts = 0;

    const sync = async () => {
      if (cancelled || attempts > 12) return;
      attempts += 1;
      await reloadFirebaseUser().catch(() => false);
      if (!cancelled) {
        window.setTimeout(() => void sync(), 400);
      }
    };

    void sync();

    return () => {
      cancelled = true;
    };
  }, [phase, reloadFirebaseUser]);

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
    <AnimatePresence mode="wait">
      {phase === "success" ? (
        <motion.div
          key="success"
          initial={authJourneySuccessVariants(reducedMotion).initial}
          animate={authJourneySuccessVariants(reducedMotion).animate}
          exit={authJourneySuccessVariants(reducedMotion).exit}
          transition={authJourneyPanelTransition}
        >
          <AuthJourneySuccessCard
            title={userCopy.auth.verifyEmailSuccessTitle}
            description={userCopy.auth.verifyEmailSuccess}
          />
          <Loader2
            className="size-4 animate-spin text-muted-foreground motion-reduce:animate-none"
            aria-hidden
          />
        </motion.div>
      ) : (
        <AuthJourneyStepCard key="input" surface="bare">
          <div className="mx-auto flex w-full max-w-sm flex-col gap-8">
            <AuthJourneyStepHeader
              icon={MailCheck}
              busyIcon={Loader2}
              iconBusy={busy}
              title={userCopy.auth.verifyEmailTitle}
              description={
                <>
                  {userCopy.auth.verifyEmailDescription}{" "}
                  <span className="font-medium text-foreground">{firebaseUser?.email}</span>
                </>
              }
            />

            <AuthJourneyStepBody startIndex={4} className="space-y-5">
              <VerificationCodeInput
                value={code}
                onChange={(next) => {
                  setError(null);
                  if (!busy) setStatus(null);
                  setCode(next);
                }}
                disabled={busy}
                invalid={Boolean(error)}
              />

              <AnimatePresence initial={false}>
                {status ? (
                  <motion.p
                    key={status}
                    initial={reducedMotion ? false : { opacity: 0, y: 4 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0 }}
                    transition={authJourneyQuickTransition}
                    className="text-center text-sm text-muted-foreground"
                  >
                    {status}
                  </motion.p>
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
                    transition={authJourneyQuickTransition}
                    className="text-center text-sm text-destructive"
                  >
                    {error}
                  </motion.p>
                ) : null}
              </AnimatePresence>

              <div className="space-y-2">
                <AuthJourneyReveal index={5}>
                  <Button
                    type="button"
                    variant="outline"
                    className="h-11 w-full"
                    disabled={busy}
                    onClick={() => void onResend()}
                  >
                    Отправить код повторно
                  </Button>
                </AuthJourneyReveal>
                <AuthJourneyReveal index={6}>
                  <Button
                    type="button"
                    variant="ghost"
                    className="w-full"
                    disabled={busy}
                    onClick={() => void logout()}
                  >
                    Выйти
                  </Button>
                </AuthJourneyReveal>
              </div>
            </AuthJourneyStepBody>
          </div>
        </AuthJourneyStepCard>
      )}
    </AnimatePresence>
  );
}
