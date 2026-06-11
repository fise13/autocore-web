"use client";

import { ReactNode, useEffect } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Check, LucideIcon } from "lucide-react";

import { FloatingPaths } from "@/components/auth/floating-paths";
import { AppLogo } from "@/components/brand/app-logo";
import { enterPageTransition, enterPageVariants } from "@/lib/motion";
import { prefersReducedMotion } from "@/lib/motion/cross-route-transition";
import { cn } from "@/lib/utils";

const ease = [0.22, 1, 0.36, 1] as const;

export type SetupWizardStepMeta = {
  id: number;
  title: string;
  subtitle: string;
  icon: LucideIcon;
};

type SetupWizardShellProps = {
  children: ReactNode;
};

export function SetupWizardShell({ children }: SetupWizardShellProps) {
  return (
    <div className="relative flex min-h-screen items-center justify-center overflow-hidden bg-background p-4 sm:p-6">
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 -z-10 opacity-70"
      >
        <div className="absolute inset-0 bg-gradient-to-b from-primary/5 via-background to-muted/30" />
        <div className="absolute top-0 right-0 h-96 w-72 -translate-y-1/3 rounded-full bg-[radial-gradient(ellipse_at_center,color-mix(in_srgb,var(--primary)_18%,transparent)_0,transparent_70%)]" />
        <div className="absolute bottom-0 left-0 h-80 w-80 translate-y-1/4 rounded-full bg-[radial-gradient(ellipse_at_center,color-mix(in_srgb,var(--chart-2)_12%,transparent)_0,transparent_72%)]" />
        <FloatingPaths position={1} />
      </div>

      <motion.div
        className="w-full max-w-2xl"
        initial={prefersReducedMotion() ? false : enterPageVariants.initial}
        animate={enterPageVariants.animate}
        transition={enterPageTransition}
      >
        {children}
      </motion.div>
    </div>
  );
}

type SetupWizardHeaderProps = {
  steps: SetupWizardStepMeta[];
  currentStep: number;
};

export function SetupWizardHeader({ steps, currentStep }: SetupWizardHeaderProps) {
  const active = steps.find((step) => step.id === currentStep);

  return (
    <div className="mb-6 space-y-5 text-center sm:mb-8">
      <motion.div
        className="flex justify-center"
        initial={prefersReducedMotion() ? false : { opacity: 0, scale: 0.92 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.4, ease }}
      >
        <div className="rounded-2xl border border-primary/15 bg-primary/5 p-3 shadow-sm">
          <AppLogo size={36} />
        </div>
      </motion.div>

      <div className="space-y-1">
        <h1 className="text-2xl font-semibold tracking-tight sm:text-3xl">Первая настройка</h1>
        <p className="text-sm text-muted-foreground sm:text-base">
          Настройте AutoCore под ваш бизнес за пару минут
        </p>
      </div>

      <SetupWizardProgress steps={steps} currentStep={currentStep} />

      {active ? (
        <motion.div
          key={active.id}
          initial={prefersReducedMotion() ? false : { opacity: 0, y: 6 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.24, ease }}
          className="mx-auto max-w-lg space-y-1"
        >
          <p className="text-xs font-medium tracking-wide text-primary uppercase">
            Шаг {active.id} из {steps.length}
          </p>
          <p className="text-base font-medium text-foreground">{active.title}</p>
          <p className="text-sm text-muted-foreground">{active.subtitle}</p>
        </motion.div>
      ) : null}
    </div>
  );
}

function SetupWizardProgress({ steps, currentStep }: SetupWizardHeaderProps) {
  return (
    <div className="mx-auto flex max-w-md items-center gap-2 px-2">
      {steps.map((step, index) => {
        const done = currentStep > step.id;
        const active = currentStep === step.id;
        const Icon = step.icon;

        return (
          <div key={step.id} className="flex flex-1 items-center gap-2">
            <motion.div
              className={cn(
                "relative flex size-9 shrink-0 items-center justify-center rounded-full border text-xs font-semibold transition-colors duration-300",
                done && "border-primary/30 bg-primary text-primary-foreground",
                active && "border-primary bg-primary/10 text-primary ring-2 ring-primary/20",
                !done && !active && "border-border/80 bg-muted/40 text-muted-foreground",
              )}
              animate={
                active && !prefersReducedMotion()
                  ? { scale: [1, 1.06, 1] }
                  : { scale: 1 }
              }
              transition={{ duration: 0.45, ease }}
            >
              {done ? (
                <Check className="size-4" aria-hidden />
              ) : (
                <Icon className="size-4" aria-hidden />
              )}
            </motion.div>

            {index < steps.length - 1 ? (
              <div className="relative h-0.5 flex-1 overflow-hidden rounded-full bg-border/80">
                <motion.div
                  className="absolute inset-y-0 left-0 rounded-full bg-primary"
                  initial={{ width: "0%" }}
                  animate={{ width: done ? "100%" : active ? "35%" : "0%" }}
                  transition={{ duration: 0.35, ease }}
                />
              </div>
            ) : null}
          </div>
        );
      })}
    </div>
  );
}

type SetupWizardCardProps = {
  children: ReactNode;
  className?: string;
};

export function SetupWizardCard({ children, className }: SetupWizardCardProps) {
  return (
    <div
      className={cn(
        "overflow-hidden rounded-2xl border border-border/70 bg-card/95 shadow-lg shadow-black/5 backdrop-blur-sm",
        className,
      )}
    >
      {children}
    </div>
  );
}

type SetupWizardStepPanelProps = {
  stepKey: number;
  direction: number;
  children: ReactNode;
};

export function SetupWizardStepPanel({ stepKey, direction, children }: SetupWizardStepPanelProps) {
  const reduced = prefersReducedMotion();

  return (
    <AnimatePresence mode="wait" custom={direction}>
      <motion.div
        key={stepKey}
        custom={direction}
        initial={reduced ? false : { opacity: 0, x: direction * 28, filter: "blur(4px)" }}
        animate={{ opacity: 1, x: 0, filter: "blur(0px)" }}
        exit={reduced ? undefined : { opacity: 0, x: direction * -28, filter: "blur(4px)" }}
        transition={{ duration: 0.3, ease }}
        className="space-y-4"
      >
        {children}
      </motion.div>
    </AnimatePresence>
  );
}

type SelectableTileProps = {
  selected: boolean;
  onClick: () => void;
  title: string;
  description?: string;
  icon?: LucideIcon;
  disabled?: boolean;
  index?: number;
};

export function SelectableTile({
  selected,
  onClick,
  title,
  description,
  icon: Icon,
  disabled = false,
  index = 0,
}: SelectableTileProps) {
  const reduced = prefersReducedMotion();

  return (
    <motion.button
      type="button"
      disabled={disabled}
      onClick={onClick}
      initial={reduced ? false : { opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.04, duration: 0.28, ease }}
      whileTap={reduced ? undefined : { scale: 0.985 }}
      className={cn(
        "group relative w-full rounded-xl border p-3.5 text-left transition-colors duration-300 sm:p-4",
        selected
          ? "border-primary/40 bg-primary/5 ring-1 ring-primary/25"
          : "border-border/70 bg-background/60 hover:border-border hover:bg-muted/30",
        disabled && "pointer-events-none opacity-60",
      )}
    >
      <div className="flex items-start gap-3">
        {Icon ? (
          <span
            className={cn(
              "flex size-9 shrink-0 items-center justify-center rounded-lg border transition-colors duration-300",
              selected
                ? "border-primary/25 bg-primary/10 text-primary"
                : "border-border/70 bg-muted/30 text-muted-foreground group-hover:text-foreground",
            )}
          >
            <Icon className="size-4" aria-hidden />
          </span>
        ) : null}

        <span className="min-w-0 flex-1">
          <span className="block text-sm font-medium text-foreground">{title}</span>
          {description ? (
            <span className="mt-0.5 block text-xs leading-relaxed text-muted-foreground">
              {description}
            </span>
          ) : null}
        </span>

        <span
          className={cn(
            "flex size-5 shrink-0 items-center justify-center rounded-full border transition-all duration-300",
            selected
              ? "border-primary bg-primary text-primary-foreground"
              : "border-border bg-background",
          )}
          aria-hidden
        >
          <AnimatePresence mode="wait" initial={false}>
            {selected ? (
              <motion.span
                key="on"
                initial={{ scale: 0.4, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.4, opacity: 0 }}
                transition={{ duration: 0.15 }}
              >
                <Check className="size-3" />
              </motion.span>
            ) : null}
          </AnimatePresence>
        </span>
      </div>
    </motion.button>
  );
}

type CategoryGroupHeaderProps = {
  label: string;
  count: number;
};

export function CategoryGroupHeader({ label, count }: CategoryGroupHeaderProps) {
  return (
    <div className="flex items-center justify-between gap-2 px-0.5 pt-1">
      <p className="text-xs font-semibold tracking-wide text-muted-foreground uppercase">{label}</p>
      {count > 0 ? (
        <span className="rounded-full bg-primary/10 px-2 py-0.5 text-[10px] font-medium text-primary">
          {count}
        </span>
      ) : null}
    </div>
  );
}

type ModeToggleProps = {
  mode: "tracked" | "quick";
  onChange: (mode: "tracked" | "quick") => void;
};

export function CategoryModeToggle({ mode, onChange }: ModeToggleProps) {
  return (
    <div className="mt-3 overflow-hidden pl-12">
      <div className="autocore-segmented-tabs inline-flex rounded-lg p-0.5">
        {(
          [
            { id: "tracked" as const, label: "Полный учёт" },
            { id: "quick" as const, label: "Только продажа" },
          ] as const
        ).map((option) => (
          <button
            key={option.id}
            type="button"
            onClick={() => onChange(option.id)}
            className={cn(
              "rounded-md px-3 py-1.5 text-xs font-medium transition-all duration-200",
              mode === option.id
                ? "bg-background text-foreground shadow-sm"
                : "text-muted-foreground hover:text-foreground",
            )}
          >
            {option.label}
          </button>
        ))}
      </div>
    </div>
  );
}

type SetupWizardSuccessProps = {
  onDone: () => void;
};

export function SetupWizardSuccess({ onDone }: SetupWizardSuccessProps) {
  useEffect(() => {
    const delay = prefersReducedMotion() ? 400 : 1400;
    const timer = window.setTimeout(onDone, delay);
    return () => window.clearTimeout(timer);
  }, [onDone]);

  return (
    <SetupWizardShell>
      <motion.div
        className="flex flex-col items-center gap-6 py-16 text-center"
        initial={prefersReducedMotion() ? false : { opacity: 0, scale: 0.96 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.4, ease }}
      >
        <motion.div
          className="flex size-16 items-center justify-center rounded-full bg-emerald-500/15 text-emerald-600 dark:text-emerald-400"
          initial={prefersReducedMotion() ? false : { scale: 0 }}
          animate={{ scale: 1 }}
          transition={{ type: "spring", stiffness: 260, damping: 18, delay: 0.1 }}
        >
          <Check className="size-8" strokeWidth={2.5} aria-hidden />
        </motion.div>
        <div className="space-y-2">
          <h2 className="text-2xl font-semibold tracking-tight">Всё готово</h2>
          <p className="max-w-sm text-sm text-muted-foreground">
            Настройки сохранены. Открываем рабочее пространство…
          </p>
        </div>
        <motion.div
          className="h-1 w-48 overflow-hidden rounded-full bg-muted"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.2 }}
        >
          <motion.div
            className="h-full rounded-full bg-primary"
            initial={{ width: "0%" }}
            animate={{ width: "100%" }}
            transition={{ duration: prefersReducedMotion() ? 0.35 : 1.1, ease }}
          />
        </motion.div>
      </motion.div>
    </SetupWizardShell>
  );
}
