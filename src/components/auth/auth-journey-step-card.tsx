"use client";

import { ReactNode } from "react";
import { motion } from "framer-motion";
import type { LucideIcon } from "lucide-react";
import { CheckCircle2 } from "lucide-react";

import { AuthJourneyReveal } from "@/components/auth/auth-journey-reveal";
import {
  authJourneyPanelTransition,
  authJourneyPanelVariants,
  authJourneyReveal,
} from "@/lib/motion/auth-journey-motion";
import { prefersReducedMotion } from "@/lib/motion/cross-route-transition";
import { cn } from "@/lib/utils";

type AuthJourneySurface = "card" | "bare";

type AuthJourneyStepCardProps = {
  children: ReactNode;
  className?: string;
  direction?: number;
  surface?: AuthJourneySurface;
};

export function AuthJourneyStepCard({
  children,
  className,
  direction = 1,
  surface = "bare",
}: AuthJourneyStepCardProps) {
  const reducedMotion = prefersReducedMotion();
  const motionState = authJourneyPanelVariants(reducedMotion, direction);

  return (
    <motion.div
      initial={motionState.initial}
      animate={motionState.animate}
      exit={motionState.exit}
      transition={authJourneyPanelTransition}
      className={cn(
        surface === "card" &&
          "overflow-hidden rounded-2xl border border-border/70 bg-card/95 shadow-xl backdrop-blur-sm",
        surface === "bare" && "w-full",
        className,
      )}
    >
      {children}
    </motion.div>
  );
}

type AuthJourneyStepHeaderProps = {
  icon: LucideIcon;
  title: string;
  description: ReactNode;
  badge?: ReactNode;
  iconBusy?: boolean;
  busyIcon?: LucideIcon;
  centered?: boolean;
};

export function AuthJourneyStepHeader({
  icon: Icon,
  title,
  description,
  badge,
  iconBusy = false,
  busyIcon: BusyIcon,
  centered = true,
}: AuthJourneyStepHeaderProps) {
  const DisplayIcon = iconBusy && BusyIcon ? BusyIcon : Icon;

  return (
    <div className={cn("space-y-5", centered && "text-center")}>
      <AuthJourneyReveal index={0}>
        <div className="mx-auto flex size-12 items-center justify-center rounded-xl border border-border/60 bg-muted/20 text-primary">
          <DisplayIcon className={cn("size-5", iconBusy && "animate-spin motion-reduce:animate-none")} aria-hidden />
        </div>
      </AuthJourneyReveal>
      <div className="space-y-2">
        <AuthJourneyReveal index={1} as="h1" className="text-2xl font-semibold tracking-tight sm:text-3xl">
          {title}
        </AuthJourneyReveal>
        {badge ? <AuthJourneyReveal index={2}>{badge}</AuthJourneyReveal> : null}
        <AuthJourneyReveal index={badge ? 3 : 2} as="p" className="mx-auto max-w-md text-sm leading-relaxed text-muted-foreground">
          {description}
        </AuthJourneyReveal>
      </div>
    </div>
  );
}

type AuthJourneyStepBodyProps = {
  children: ReactNode;
  className?: string;
  startIndex?: number;
};

export function AuthJourneyStepBody({
  children,
  className,
  startIndex = 3,
}: AuthJourneyStepBodyProps) {
  const reducedMotion = prefersReducedMotion();

  return (
    <motion.div
      {...authJourneyReveal(startIndex, reducedMotion)}
      className={cn("space-y-4", className)}
    >
      {children}
    </motion.div>
  );
}

type AuthJourneySuccessCardProps = {
  title: string;
  description: string;
};

export function AuthJourneySuccessCard({ title, description }: AuthJourneySuccessCardProps) {
  const reducedMotion = prefersReducedMotion();

  return (
    <div className="flex flex-col items-center gap-5 py-6 text-center">
      <motion.span
        initial={reducedMotion ? false : { scale: 0.8, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ delay: 0.08, duration: 0.36, ease: authJourneyPanelTransition.ease }}
        className="flex size-14 items-center justify-center rounded-full bg-primary/10 text-primary"
      >
        <CheckCircle2 className="size-7" aria-hidden />
      </motion.span>
      <AuthJourneyReveal index={1}>
        <div className="space-y-1">
          <p className="text-xl font-semibold tracking-tight">{title}</p>
          <p className="text-sm text-muted-foreground">{description}</p>
        </div>
      </AuthJourneyReveal>
    </div>
  );
}
