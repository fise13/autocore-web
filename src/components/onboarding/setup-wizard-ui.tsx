"use client";

import { ReactNode } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Check, LucideIcon } from "lucide-react";

import { AppLogo } from "@/components/brand/app-logo";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { SETUP_WIZARD_COPY, type SetupWizardStepMeta } from "@/lib/onboarding/setup-wizard-copy";
import { enterPageTransition, enterPageVariants } from "@/lib/motion";
import { prefersReducedMotion } from "@/lib/motion/cross-route-transition";
import { cn } from "@/lib/utils";

const ease = [0.22, 1, 0.36, 1] as const;

type SetupWizardShellProps = {
  children: ReactNode;
};

export function SetupWizardShell({ children }: SetupWizardShellProps) {
  return (
    <div className="flex min-h-screen items-center justify-center bg-background p-4 sm:p-6 lg:p-8">
      <div
        aria-hidden
        className="pointer-events-none fixed inset-0 -z-10 bg-[radial-gradient(ellipse_80%_50%_at_50%_-20%,color-mix(in_oklab,var(--primary)_12%,transparent),transparent)]"
      />

      <motion.div
        className="w-full max-w-4xl"
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
  const progress = Math.round((currentStep / steps.length) * 100);

  return (
    <header className="mb-6 flex flex-col gap-5 sm:mb-8">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3">
          <div className="flex size-11 items-center justify-center rounded-xl border border-border/80 bg-card shadow-sm">
            <AppLogo size={28} />
          </div>
          <div>
            <h1 className="text-xl font-semibold tracking-tight sm:text-2xl">
              {SETUP_WIZARD_COPY.shell.title}
            </h1>
            <p className="text-sm text-muted-foreground">{SETUP_WIZARD_COPY.shell.subtitle}</p>
          </div>
        </div>
        <Badge variant="secondary" className="w-fit">
          {SETUP_WIZARD_COPY.actions.stepCounter(currentStep, steps.length)}
        </Badge>
      </div>

      <div className="h-1.5 overflow-hidden rounded-full bg-muted">
        <motion.div
          className="h-full rounded-full bg-primary"
          initial={false}
          animate={{ width: `${progress}%` }}
          transition={{ duration: 0.35, ease }}
        />
      </div>
    </header>
  );
}

type SetupWizardLayoutProps = {
  steps: SetupWizardStepMeta[];
  currentStep: number;
  children: ReactNode;
  footer: ReactNode;
  status?: ReactNode;
};

export function SetupWizardLayout({
  steps,
  currentStep,
  children,
  footer,
  status,
}: SetupWizardLayoutProps) {
  const active = steps.find((step) => step.id === currentStep);

  return (
    <div className="grid gap-4 lg:grid-cols-[minmax(0,13rem)_minmax(0,1fr)] lg:gap-6">
      <nav
        aria-label="Шаги настройки"
        className="hidden flex-col gap-1 rounded-2xl border border-border/70 bg-card/60 p-2 lg:flex"
      >
        {steps.map((step) => {
          const done = currentStep > step.id;
          const activeStep = currentStep === step.id;
          const Icon = step.icon;

          return (
            <div
              key={step.id}
              className={cn(
                "flex items-start gap-2.5 rounded-xl px-3 py-2.5 transition-colors duration-200",
                activeStep && "bg-primary/8 text-foreground",
                done && !activeStep && "text-muted-foreground",
                !done && !activeStep && "text-muted-foreground/80",
              )}
            >
              <span
                className={cn(
                  "mt-0.5 flex size-7 shrink-0 items-center justify-center rounded-lg border",
                  done && "border-primary/30 bg-primary text-primary-foreground",
                  activeStep && "border-primary/25 bg-primary/10 text-primary",
                  !done && !activeStep && "border-border/80 bg-muted/30",
                )}
              >
                {done ? <Check className="size-3.5" aria-hidden /> : <Icon className="size-3.5" aria-hidden />}
              </span>
              <span className="min-w-0">
                <span className="block text-xs font-medium">{step.title}</span>
                <span className="mt-0.5 block text-[11px] leading-snug text-muted-foreground">
                  {step.subtitle}
                </span>
              </span>
            </div>
          );
        })}
      </nav>

      <SetupWizardCard>
        {active ? (
          <div className="border-b border-border/60 bg-muted/15 px-4 py-4 sm:px-6">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div className="min-w-0 space-y-1">
                <p className="text-xs font-medium tracking-wide text-primary uppercase lg:hidden">
                  {SETUP_WIZARD_COPY.actions.stepCounter(active.id, steps.length)}
                </p>
                <h2 className="text-lg font-semibold tracking-tight">{active.title}</h2>
                <p className="text-sm text-muted-foreground">{active.subtitle}</p>
              </div>
              {status ? <div className="flex flex-wrap gap-2">{status}</div> : null}
            </div>
          </div>
        ) : null}

        <div className="p-4 sm:p-6">{children}</div>

        <Separator />

        <div className="px-4 py-4 sm:px-6">{footer}</div>
      </SetupWizardCard>
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
        "overflow-hidden rounded-2xl border border-border/70 bg-card shadow-sm",
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
        initial={reduced ? false : { opacity: 0, x: direction * 16 }}
        animate={{ opacity: 1, x: 0 }}
        exit={reduced ? undefined : { opacity: 0, x: direction * -16 }}
        transition={{ duration: 0.24, ease }}
        className="flex flex-col gap-4"
      >
        {children}
      </motion.div>
    </AnimatePresence>
  );
}

type PresetChipProps = {
  label: string;
  description: string;
  selected: boolean;
  onClick: () => void;
};

export function PresetChip({ label, description, selected, onClick }: PresetChipProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "cursor-pointer rounded-xl border px-3 py-2.5 text-left transition-colors duration-200",
        selected
          ? "border-primary/40 bg-primary/5 ring-1 ring-primary/20"
          : "border-border/70 bg-background hover:border-border hover:bg-muted/30",
      )}
    >
      <span className="block text-sm font-medium">{label}</span>
      <span className="mt-0.5 block text-xs text-muted-foreground">{description}</span>
    </button>
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
      initial={reduced ? false : { opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.03, duration: 0.22, ease }}
      className={cn(
        "group relative w-full cursor-pointer rounded-xl border p-3.5 text-left transition-colors duration-200 sm:p-4",
        selected
          ? "border-primary/40 bg-primary/5 ring-1 ring-primary/20"
          : "border-border/70 bg-background hover:border-border hover:bg-muted/25",
        disabled && "pointer-events-none opacity-55",
      )}
    >
      <div className="flex items-start gap-3">
        {Icon ? (
          <span
            className={cn(
              "flex size-9 shrink-0 items-center justify-center rounded-lg border transition-colors duration-200",
              selected
                ? "border-primary/25 bg-primary/10 text-primary"
                : "border-border/70 bg-muted/25 text-muted-foreground group-hover:text-foreground",
            )}
          >
            <Icon className="size-4" aria-hidden />
          </span>
        ) : null}

        <span className="min-w-0 flex-1">
          <span className="block text-sm font-medium">{title}</span>
          {description ? (
            <span className="mt-0.5 block text-xs leading-relaxed text-muted-foreground">
              {description}
            </span>
          ) : null}
        </span>

        <span
          className={cn(
            "flex size-5 shrink-0 items-center justify-center rounded-full border transition-colors duration-200",
            selected ? "border-primary bg-primary text-primary-foreground" : "border-border bg-background",
          )}
          aria-hidden
        >
          {selected ? <Check className="size-3" /> : null}
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
    <div className="flex items-center justify-between gap-2 px-0.5">
      <p className="text-xs font-semibold tracking-wide text-muted-foreground uppercase">{label}</p>
      {count > 0 ? <Badge variant="secondary">{count}</Badge> : null}
    </div>
  );
}

type ModeToggleProps = {
  mode: "tracked" | "quick";
  onChange: (mode: "tracked" | "quick") => void;
};

export function CategoryModeToggle({ mode, onChange }: ModeToggleProps) {
  const options = [
    { id: "tracked" as const, label: SETUP_WIZARD_COPY.categories.modeTracked },
    { id: "quick" as const, label: SETUP_WIZARD_COPY.categories.modeQuick },
  ];

  return (
    <div className="mt-3 pl-12">
      <div className="inline-flex rounded-lg border border-border/70 bg-muted/30 p-0.5">
        {options.map((option) => (
          <button
            key={option.id}
            type="button"
            onClick={() => onChange(option.id)}
            className={cn(
              "cursor-pointer rounded-md px-3 py-1.5 text-xs font-medium transition-colors duration-200",
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
  return (
    <SetupWizardShell>
      <motion.div
        className="flex flex-col items-center gap-6 rounded-2xl border border-border/70 bg-card px-6 py-16 text-center shadow-sm"
        initial={prefersReducedMotion() ? false : { opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.35, ease }}
      >
        <span className="flex size-14 items-center justify-center rounded-full bg-primary/10 text-primary">
          <Check className="size-7" strokeWidth={2.5} aria-hidden />
        </span>
        <div className="space-y-2">
          <h2 className="text-2xl font-semibold tracking-tight">{SETUP_WIZARD_COPY.success.title}</h2>
          <p className="max-w-sm text-sm text-muted-foreground">{SETUP_WIZARD_COPY.success.subtitle}</p>
        </div>
        <div className="h-1 w-48 overflow-hidden rounded-full bg-muted">
          <motion.div
            className="h-full rounded-full bg-primary"
            initial={{ width: "0%" }}
            animate={{ width: "100%" }}
            transition={{ duration: prefersReducedMotion() ? 0.3 : 1, ease }}
            onAnimationComplete={onDone}
          />
        </div>
      </motion.div>
    </SetupWizardShell>
  );
}

export type { SetupWizardStepMeta };
