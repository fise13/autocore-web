"use client";

import { ReactNode, useEffect } from "react";
import { AnimatePresence, motion } from "framer-motion";

import { FloatingPaths } from "@/components/auth/floating-paths";
import { AppLogo } from "@/components/brand/app-logo";
import {
  authJourneyBrandReveal,
  authJourneyStepTransition,
  authJourneyStepVariants,
} from "@/lib/motion/auth-journey-motion";
import {
  peekAuthSessionTransition,
  playAuthSessionEnter,
} from "@/lib/motion/auth-session-transition";
import { resetDissolveVeil } from "@/lib/motion/dissolve-transition";
import { prefersReducedMotion } from "@/lib/motion/cross-route-transition";
import { cn } from "@/lib/utils";

export type AuthJourneyContentWidth = "sm" | "md" | "lg" | "xl";
export type AuthJourneyLayout = "split" | "center";

const contentWidthClass: Record<AuthJourneyContentWidth, string> = {
  sm: "max-w-sm",
  md: "max-w-md",
  lg: "max-w-lg",
  xl: "max-w-3xl",
};

type AuthJourneyShellProps = {
  stepKey: string;
  children: ReactNode;
  topLeft?: ReactNode;
  stepLabel?: string;
  contentWidth?: AuthJourneyContentWidth;
  layout?: AuthJourneyLayout;
  className?: string;
};

function AuthJourneyBackdrop({ centered = false }: { centered?: boolean }) {
  return (
    <div aria-hidden className="pointer-events-none absolute inset-0 -z-10 overflow-hidden">
      <div
        className={cn(
          "absolute inset-0 opacity-[0.35] dark:opacity-[0.22]",
          "bg-[radial-gradient(circle_at_center,color-mix(in_oklab,var(--foreground)_5%,transparent)_1px,transparent_1px)]",
          "bg-[size:22px_22px]",
        )}
      />
      <div
        className={cn(
          "absolute inset-0",
          centered
            ? "bg-[radial-gradient(ellipse_70%_55%_at_50%_0%,color-mix(in_oklab,var(--primary)_10%,transparent),transparent_70%)]"
            : "opacity-60",
        )}
      >
        {centered ? (
          <>
            <FloatingPaths position={1} />
            <FloatingPaths position={-1} />
          </>
        ) : null}
      </div>
      {!centered ? (
        <>
          <div className="absolute top-0 right-0 h-80 w-56 -translate-y-1/2 rounded-full bg-[radial-gradient(68.54%_68.72%_at_55.02%_31.46%,color-mix(in_srgb,var(--foreground)_6%,transparent)_0,color-mix(in_srgb,var(--foreground)_2%,transparent)_50%,transparent_80%)]" />
          <div className="absolute top-0 right-0 h-80 w-40 translate-x-[5%] -translate-y-1/2 rounded-full bg-[radial-gradient(50%_50%_at_50%_50%,color-mix(in_srgb,var(--foreground)_4%,transparent)_0,transparent_80%)]" />
        </>
      ) : null}
    </div>
  );
}

export function AuthJourneyBrandPanel({ stepLabel }: { stepLabel?: string }) {
  const reducedMotion = prefersReducedMotion();

  return (
    <div
      data-auth-journey-brand
      data-page-reveal
      className="relative hidden h-full flex-col border-r border-border bg-secondary p-10 lg:flex dark:bg-secondary/20"
    >
      <div className="absolute inset-0 bg-gradient-to-b from-transparent via-transparent to-background" />

      <motion.div {...authJourneyBrandReveal(0, reducedMotion)} className="relative z-10 mr-auto">
        <AppLogo size={28} className="h-7 w-auto" priority />
      </motion.div>

      <div className="relative z-10 mt-auto space-y-6">
        {stepLabel ? (
          <motion.p
            key={stepLabel}
            {...authJourneyBrandReveal(1, reducedMotion)}
            className="text-xs font-medium tracking-[0.14em] text-muted-foreground uppercase"
          >
            {stepLabel}
          </motion.p>
        ) : null}
        <blockquote className="space-y-2">
          <motion.p
            {...authJourneyBrandReveal(2, reducedMotion)}
            className="text-xl leading-relaxed"
          >
            &ldquo;AutoCore помогает закрывать наряды быстрее — склад, цех и бухгалтерия наконец говорят на
            одном языке.&rdquo;
          </motion.p>
          <motion.footer
            {...authJourneyBrandReveal(3, reducedMotion)}
            className="font-mono text-sm font-semibold"
          >
            ~ Команда AutoCore
          </motion.footer>
        </blockquote>
      </div>

      <motion.div
        initial={reducedMotion ? false : { opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.75, duration: 0.8, ease: authJourneyStepTransition.ease }}
        className="absolute inset-0"
      >
        <FloatingPaths position={1} />
        <FloatingPaths position={-1} />
      </motion.div>
    </div>
  );
}

export function AuthJourneyShell({
  stepKey,
  children,
  topLeft,
  stepLabel,
  contentWidth = "sm",
  layout = "split",
  className,
}: AuthJourneyShellProps) {
  const reducedMotion = prefersReducedMotion();
  const stepMotion = authJourneyStepVariants(reducedMotion);
  const centered = layout === "center";

  useEffect(() => {
    resetDissolveVeil();
    if (peekAuthSessionTransition() === "sign-in") {
      void playAuthSessionEnter("sign-in");
    }
  }, []);

  if (centered) {
    return (
      <main
        data-auth-journey-shell
        data-auth-journey-centered
        data-login-screen
        className={cn("relative min-h-screen overflow-hidden", className)}
      >
        <AuthJourneyBackdrop centered />

        <div className="relative flex min-h-screen flex-col items-center justify-center px-6 py-12 sm:px-8">
          <div className={cn("w-full text-center", contentWidthClass[contentWidth])}>
            <AnimatePresence mode="wait">
              <motion.div
                key={stepKey}
                data-auth-journey-step
                initial={stepMotion.initial}
                animate={stepMotion.animate}
                exit={stepMotion.exit}
                transition={authJourneyStepTransition}
              >
                {children}
              </motion.div>
            </AnimatePresence>
          </div>
        </div>
      </main>
    );
  }

  return (
    <main
      data-auth-journey-shell
      data-login-screen
      className={cn("relative md:h-screen md:overflow-hidden lg:grid lg:grid-cols-2", className)}
    >
      <AuthJourneyBrandPanel stepLabel={stepLabel} />

      <div
        data-auth-journey-content
        className="relative flex min-h-screen flex-col justify-center overflow-hidden px-6 py-10 sm:px-8"
      >
        <AuthJourneyBackdrop />

        {topLeft ? <div className="absolute top-7 left-5 z-10">{topLeft}</div> : null}

        <div className={cn("relative mx-auto w-full", contentWidthClass[contentWidth])}>
          <AppLogo size={28} className="mb-6 h-7 w-auto lg:hidden" priority />

          <AnimatePresence mode="wait">
            <motion.div
              key={stepKey}
              data-auth-journey-step
              initial={stepMotion.initial}
              animate={stepMotion.animate}
              exit={stepMotion.exit}
              transition={authJourneyStepTransition}
            >
              {children}
            </motion.div>
          </AnimatePresence>
        </div>
      </div>
    </main>
  );
}
