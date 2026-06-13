"use client";

import { FormEvent, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { CheckCircle2, Loader2, Sparkles } from "lucide-react";

import { AuthJourneyReveal } from "@/components/auth/auth-journey-reveal";
import {
  AuthJourneyStepBody,
  AuthJourneyStepCard,
} from "@/components/auth/auth-journey-step-card";
import { ProfileNameFields } from "@/components/auth/profile-name-fields";
import { useAuth } from "@/components/providers/auth-provider";
import { Button } from "@/components/ui/button";
import {
  authJourneyPanelTransition,
  authJourneySuccessVariants,
} from "@/lib/motion/auth-journey-motion";
import { prefersReducedMotion } from "@/lib/motion/cross-route-transition";
import { useUserPreferences } from "@/hooks/use-user-preferences";

type ProfileNameStepProps = {
  onSaved: (fullName: string) => void;
};

type Phase = "form" | "success";

export function ProfileNameStep({ onSaved }: ProfileNameStepProps) {
  const { profile, refreshProfile } = useAuth();
  const uid = profile?.id ?? "";
  const { updateAccountProfile } = useUserPreferences(uid);
  const reducedMotion = prefersReducedMotion();

  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [phase, setPhase] = useState<Phase>("form");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const trimmedFirst = firstName.trim();
    const trimmedLast = lastName.trim();
    if (!trimmedFirst || !trimmedLast) {
      setError("Укажите имя и фамилию.");
      return;
    }

    const fullName = `${trimmedFirst} ${trimmedLast}`;
    setIsSubmitting(true);
    setError(null);

    try {
      await updateAccountProfile({ name: fullName });
      setPhase("success");
      void refreshProfile().catch(() => undefined);
      window.setTimeout(() => onSaved(fullName), 420);
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : "Не удалось сохранить имя");
      setIsSubmitting(false);
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
          className="flex flex-col items-center gap-4 py-8 text-center"
        >
          <div className="flex size-14 items-center justify-center rounded-full bg-primary/10">
            <CheckCircle2 className="size-7 text-primary" aria-hidden />
          </div>
          <div className="flex flex-col gap-1">
            <p className="text-lg font-semibold tracking-tight">Профиль сохранён</p>
            <p className="text-sm text-muted-foreground">Готовим следующий шаг…</p>
          </div>
          <Loader2 className="size-4 animate-spin text-muted-foreground motion-reduce:animate-none" aria-hidden />
        </motion.div>
      ) : (
        <AuthJourneyStepCard key="form" surface="bare">
          <div className="mx-auto flex w-full max-w-sm flex-col gap-8 text-center">
            <div className="space-y-3">
              <AuthJourneyReveal index={0}>
                <div className="inline-flex items-center justify-center gap-1.5 rounded-full border border-border/60 bg-muted/20 px-2.5 py-1 text-[11px] font-medium tracking-wide text-muted-foreground uppercase">
                  <Sparkles className="size-3 text-primary" aria-hidden />
                  Шаг 2
                </div>
              </AuthJourneyReveal>
              <AuthJourneyReveal index={1} as="h1" className="text-2xl font-semibold tracking-tight sm:text-3xl">
                Как к вам обращаться?
              </AuthJourneyReveal>
              <AuthJourneyReveal index={2} as="p" className="text-sm text-muted-foreground">
                Имя и фамилия появятся в документах, команде и подписях.
              </AuthJourneyReveal>
            </div>

            <AuthJourneyStepBody startIndex={3} className="text-left">
              <form onSubmit={onSubmit} className="flex flex-col gap-4">
                <ProfileNameFields
                  firstName={firstName}
                  lastName={lastName}
                  onFirstNameChange={setFirstName}
                  onLastNameChange={setLastName}
                  disabled={isSubmitting}
                />

                <AuthJourneyReveal index={4}>
                  <Button type="submit" disabled={isSubmitting} className="h-11 w-full">
                    {isSubmitting ? (
                      <>
                        <Loader2 className="animate-spin" data-icon="inline-start" aria-hidden />
                        Сохраняем…
                      </>
                    ) : (
                      "Продолжить"
                    )}
                  </Button>
                </AuthJourneyReveal>

                {error ? (
                  <motion.p
                    role="alert"
                    className="text-center text-sm text-destructive"
                    initial={reducedMotion ? false : { opacity: 0, y: 4 }}
                    animate={{ opacity: 1, y: 0 }}
                  >
                    {error}
                  </motion.p>
                ) : null}
              </form>
            </AuthJourneyStepBody>
          </div>
        </AuthJourneyStepCard>
      )}
    </AnimatePresence>
  );
}
