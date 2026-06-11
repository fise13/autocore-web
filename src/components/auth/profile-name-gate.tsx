"use client";

import { FormEvent, ReactNode, useEffect, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { CheckCircle2, Loader2, Sparkles } from "lucide-react";

import { FloatingPaths } from "@/components/auth/floating-paths";
import { ProfileNameFields, isCompleteFullName } from "@/components/auth/profile-name-fields";
import { useAuth } from "@/components/providers/auth-provider";
import { AppLogo } from "@/components/brand/app-logo";
import { Button } from "@/components/ui/button";
import { AppLoadingScreen } from "@/components/ui/app-loading-screen";
import { useUserPreferences } from "@/hooks/use-user-preferences";
import { prefersReducedMotion } from "@/lib/motion/cross-route-transition";
import { userCopy } from "@/lib/user-copy";

type ProfileNameGateProps = {
  children: ReactNode;
};

const stepEase = [0.22, 1, 0.36, 1] as const;
const EXIT_MS = 420;

type GatePhase = "form" | "success" | "hidden";

export function ProfileNameGate({ children }: ProfileNameGateProps) {
  const { profile, isLoading, refreshProfile } = useAuth();
  const uid = profile?.id ?? "";
  const { updateAccountProfile } = useUserPreferences(uid);
  const reducedMotion = prefersReducedMotion();

  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [savedName, setSavedName] = useState<string | null>(null);
  const [phase, setPhase] = useState<GatePhase>("form");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const effectiveName = savedName ?? profile?.displayName ?? null;
  const needsName = !isCompleteFullName(effectiveName);
  const showGate = needsName && phase !== "hidden";

  useEffect(() => {
    if (!needsName && phase === "form") {
      setPhase("hidden");
    }
  }, [needsName, phase]);

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
      setSavedName(fullName);
      setPhase("success");
      void refreshProfile().catch(() => undefined);

      window.setTimeout(() => {
        setPhase("hidden");
      }, EXIT_MS);
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : "Не удалось сохранить имя");
      setIsSubmitting(false);
    }
  }

  if (isLoading || !profile) {
    return <AppLoadingScreen message={userCopy.auth.completing} />;
  }

  return (
    <>
      <AnimatePresence mode="wait">
        {showGate ? (
          <motion.div
            key="profile-name-gate"
            className="fixed inset-0 z-50 flex min-h-screen items-center justify-center bg-background p-4"
            initial={reducedMotion ? false : { opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={reducedMotion ? undefined : { opacity: 0, scale: 0.985 }}
            transition={{ duration: 0.32, ease: stepEase }}
          >
            <div aria-hidden className="pointer-events-none absolute inset-0 overflow-hidden opacity-40">
              <FloatingPaths position={1} />
              <FloatingPaths position={-1} />
            </div>

            <div
              aria-hidden
              className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_top,color-mix(in_srgb,var(--primary)_8%,transparent),transparent_55%)]"
            />

            <motion.div
              className="relative w-full max-w-md"
              initial={reducedMotion ? false : { opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={reducedMotion ? undefined : { opacity: 0, y: -16 }}
              transition={{ duration: 0.36, ease: stepEase }}
            >
              <AnimatePresence mode="wait">
                {phase === "success" ? (
                  <motion.div
                    key="success"
                    className="flex flex-col items-center gap-4 rounded-2xl border border-border/70 bg-card/95 p-8 text-center shadow-lg backdrop-blur-sm"
                    initial={reducedMotion ? false : { opacity: 0, scale: 0.96 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={reducedMotion ? undefined : { opacity: 0, y: -8 }}
                    transition={{ duration: 0.28, ease: stepEase }}
                  >
                    <div className="flex size-14 items-center justify-center rounded-full bg-primary/10">
                      <CheckCircle2 className="size-7 text-primary" />
                    </div>
                    <div className="flex flex-col gap-1">
                      <p className="text-lg font-semibold tracking-tight">Профиль сохранён</p>
                      <p className="text-sm text-muted-foreground">
                        {savedName ? `Приятно познакомиться, ${savedName.split(" ")[0]}!` : "Готовим рабочее пространство…"}
                      </p>
                    </div>
                    <Loader2 className="size-4 animate-spin text-muted-foreground motion-reduce:animate-none" aria-hidden />
                  </motion.div>
                ) : (
                  <motion.div
                    key="form"
                    className="overflow-hidden rounded-2xl border border-border/70 bg-card/95 shadow-lg backdrop-blur-sm"
                    initial={reducedMotion ? false : { opacity: 0, y: 12 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={reducedMotion ? undefined : { opacity: 0, y: -12 }}
                    transition={{ duration: 0.28, ease: stepEase }}
                  >
                    <div className="border-b border-border/50 bg-muted/20 px-6 py-5">
                      <div className="flex flex-col items-center gap-4 text-center">
                        <AppLogo size={32} className="h-8 w-auto" />
                        <div className="flex flex-col gap-1.5">
                          <div className="inline-flex items-center justify-center gap-1.5 self-center rounded-full border border-border/60 bg-background px-2.5 py-1 text-[11px] font-medium tracking-wide text-muted-foreground uppercase">
                            <Sparkles className="size-3 text-primary" />
                            Шаг 1 из 2
                          </div>
                          <h1 className="text-xl font-semibold tracking-tight">Как к вам обращаться?</h1>
                          <p className="max-w-xs text-sm text-muted-foreground">
                            Имя и фамилия появятся в документах, команде и подписях.
                          </p>
                        </div>
                      </div>
                    </div>

                    <form onSubmit={onSubmit} className="flex flex-col gap-4 px-6 py-5">
                      <ProfileNameFields
                        firstName={firstName}
                        lastName={lastName}
                        onFirstNameChange={setFirstName}
                        onLastNameChange={setLastName}
                        disabled={isSubmitting}
                      />

                      <Button type="submit" disabled={isSubmitting} className="h-10 w-full">
                        {isSubmitting ? (
                          <>
                            <Loader2 className="animate-spin" data-icon="inline-start" aria-hidden />
                            Сохраняем…
                          </>
                        ) : (
                          "Продолжить"
                        )}
                      </Button>

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
                  </motion.div>
                )}
              </AnimatePresence>
            </motion.div>
          </motion.div>
        ) : null}
      </AnimatePresence>

      <motion.div
        initial={false}
        animate={
          showGate
            ? reducedMotion
              ? { opacity: 0 }
              : { opacity: 0, scale: 0.995, filter: "blur(4px)" }
            : { opacity: 1, scale: 1, filter: "blur(0px)" }
        }
        transition={{ duration: 0.38, ease: stepEase, delay: showGate ? 0 : 0.04 }}
      >
        {children}
      </motion.div>
    </>
  );
}
