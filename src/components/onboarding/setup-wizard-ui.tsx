"use client";

import { ReactNode } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Check, LucideIcon, Package, Zap } from "lucide-react";

import { AppLogo } from "@/components/brand/app-logo";
import { Badge } from "@/components/ui/badge";
import type { SpecificCategoryMode } from "@/domain/company-config";
import { SETUP_WIZARD_COPY, type SetupWizardStepMeta } from "@/lib/onboarding/setup-wizard-copy";
import {
  authJourneyEase,
  authJourneyPanelTransition,
  authJourneyPanelVariants,
  authJourneyStaggerItem,
} from "@/lib/motion/auth-journey-motion";
import { enterPageTransition, enterPageVariants } from "@/lib/motion";
import { prefersReducedMotion } from "@/lib/motion/cross-route-transition";
import { cn } from "@/lib/utils";

const ease = [0.22, 1, 0.36, 1] as const;

type SetupWizardShellProps = {
  children: ReactNode;
  embedded?: boolean;
};

export function SetupWizardShell({ children, embedded = false }: SetupWizardShellProps) {
  if (embedded) {
    return <div className="w-full">{children}</div>;
  }

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
  embedded?: boolean;
};

export function SetupWizardHeader({ steps, currentStep, embedded = false }: SetupWizardHeaderProps) {
  const progress = Math.round((currentStep / steps.length) * 100);

  if (embedded) {
    return (
      <header className="mb-8 space-y-4 text-center">
        <div className="flex items-center justify-center">
          <span className="text-xs tabular-nums text-muted-foreground">
            {SETUP_WIZARD_COPY.actions.stepCounter(currentStep, steps.length)}
          </span>
        </div>
        <div className="mx-auto h-0.5 max-w-xs overflow-hidden rounded-full bg-muted/80">
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
  embedded?: boolean;
};

function SetupWizardStepRail({
  steps,
  currentStep,
  compact = false,
}: {
  steps: SetupWizardStepMeta[];
  currentStep: number;
  compact?: boolean;
}) {
  const reducedMotion = prefersReducedMotion();

  return (
    <nav
      aria-label="Шаги настройки"
      className={cn(
        "flex gap-2",
        compact ? "flex-wrap" : "hidden flex-col gap-1 lg:flex",
      )}
    >
      {steps.map((step, index) => {
        const done = currentStep > step.id;
        const activeStep = currentStep === step.id;
        const Icon = step.icon;

        if (compact) {
          return (
            <motion.div
              key={step.id}
              layout={!reducedMotion}
              {...authJourneyStaggerItem(index, reducedMotion)}
              className={cn(
                "relative inline-flex items-center gap-2 rounded-full border px-3 py-1.5 text-sm transition-colors duration-200",
                activeStep && "border-primary/25 font-medium text-foreground",
                done && !activeStep && "border-transparent text-muted-foreground",
                !done && !activeStep && "border-transparent text-muted-foreground/60",
              )}
            >
              {activeStep && !reducedMotion ? (
                <motion.span
                  layoutId="wizard-step-pill"
                  className="absolute inset-0 rounded-full border border-primary/25 bg-primary/8"
                  transition={{ duration: 0.28, ease: authJourneyEase }}
                  aria-hidden
                />
              ) : activeStep ? (
                <span className="absolute inset-0 rounded-full border border-primary/25 bg-primary/8" aria-hidden />
              ) : null}
              <span
                className={cn(
                  "relative z-10 flex size-5 items-center justify-center rounded-full",
                  done && "bg-primary text-primary-foreground",
                  activeStep && "bg-primary/15 text-primary",
                )}
              >
                {done ? <Check className="size-3" aria-hidden /> : <Icon className="size-3" aria-hidden />}
              </span>
              <span className="relative z-10">{step.title}</span>
            </motion.div>
          );
        }

        return (
          <div
            key={step.id}
            className={cn(
              "flex items-center gap-2.5 rounded-xl px-3 py-2.5 transition-colors duration-200",
              activeStep && "bg-primary/8 text-foreground",
              done && !activeStep && "text-muted-foreground",
              !done && !activeStep && "text-muted-foreground/80",
            )}
          >
            <span
              className={cn(
                "flex size-7 shrink-0 items-center justify-center rounded-lg border",
                done && "border-primary/30 bg-primary text-primary-foreground",
                activeStep && "border-primary/25 bg-primary/10 text-primary",
                !done && !activeStep && "border-border/80 bg-muted/30",
              )}
            >
              {done ? <Check className="size-3.5" aria-hidden /> : <Icon className="size-3.5" aria-hidden />}
            </span>
            <span className="min-w-0 text-xs font-medium">{step.title}</span>
          </div>
        );
      })}
    </nav>
  );
}

export function SetupWizardLayout({
  steps,
  currentStep,
  children,
  footer,
  status,
  embedded = false,
}: SetupWizardLayoutProps) {
  const active = steps.find((step) => step.id === currentStep);

  if (embedded) {
    return (
      <div className="space-y-8">
        <div className="flex justify-center">
          <SetupWizardStepRail steps={steps} currentStep={currentStep} compact />
        </div>

        <div className="mx-auto max-h-[min(62vh,520px)] overflow-y-auto overscroll-contain">
          {children}
        </div>

        <div className="border-t border-border/40 pt-6">{footer}</div>
      </div>
    );
  }

  return (
    <div className="grid gap-4 lg:grid-cols-[minmax(0,13rem)_minmax(0,1fr)] lg:gap-6">
      <SetupWizardStepRail steps={steps} currentStep={currentStep} />

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

        <div className="border-t border-border/50 px-4 py-4 sm:px-6">{footer}</div>
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
  const variants = authJourneyPanelVariants(reduced, direction);

  return (
    <AnimatePresence mode="wait" custom={direction}>
      <motion.div
        key={stepKey}
        custom={direction}
        initial={variants.initial}
        animate={variants.animate}
        exit={variants.exit}
        transition={authJourneyPanelTransition}
        className="flex flex-col gap-6"
      >
        {children}
      </motion.div>
    </AnimatePresence>
  );
}

type PresetChipProps = {
  label: string;
  description?: string;
  selected: boolean;
  onClick: () => void;
  compact?: boolean;
};

export function PresetChip({ label, description, selected, onClick, compact = false }: PresetChipProps) {
  if (compact) {
    return (
      <motion.button
        type="button"
        onClick={onClick}
        whileTap={prefersReducedMotion() ? undefined : { scale: 0.98 }}
        className={cn(
          "cursor-pointer rounded-full border px-4 py-2 text-sm font-medium transition-colors duration-200",
          selected
            ? "border-primary/40 bg-primary/10 text-foreground"
            : "border-border/60 bg-transparent text-muted-foreground hover:border-border hover:text-foreground",
        )}
      >
        {label}
      </motion.button>
    );
  }

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
      {description ? (
        <span className="mt-0.5 block text-xs text-muted-foreground">{description}</span>
      ) : null}
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
  compact?: boolean;
};

export function SelectableTile({
  selected,
  onClick,
  title,
  description,
  icon: Icon,
  disabled = false,
  index = 0,
  compact = false,
}: SelectableTileProps) {
  const reduced = prefersReducedMotion();

  if (compact) {
    return (
      <motion.button
        type="button"
        disabled={disabled}
        onClick={onClick}
        initial={reduced ? false : { opacity: 0, y: 6 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: index * 0.02, duration: 0.2, ease }}
        className={cn(
          "group relative flex cursor-pointer flex-col gap-3 rounded-2xl border p-5 text-left transition-all duration-200",
          selected
            ? "border-primary/35 bg-primary/5 shadow-sm shadow-primary/5"
            : "border-border/50 bg-card/40 hover:border-border hover:bg-muted/20",
          disabled && "pointer-events-none opacity-50",
        )}
      >
        <span
          className={cn(
            "absolute top-4 right-4 flex size-5 items-center justify-center rounded-full border transition-colors",
            selected ? "border-primary bg-primary text-primary-foreground" : "border-border/80 bg-background",
          )}
          aria-hidden
        >
          {selected ? <Check className="size-3" /> : null}
        </span>

        {Icon ? (
          <span
            className={cn(
              "flex size-10 items-center justify-center rounded-xl border transition-colors",
              selected
                ? "border-primary/20 bg-primary/10 text-primary"
                : "border-border/60 bg-muted/20 text-muted-foreground group-hover:text-foreground",
            )}
          >
            <Icon className="size-4" aria-hidden />
          </span>
        ) : null}

        <span className="pr-6">
          <span className="block text-sm font-medium tracking-tight">{title}</span>
          {description ? (
            <span className="mt-1 block text-xs text-muted-foreground">{description}</span>
          ) : null}
        </span>
      </motion.button>
    );
  }

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
    <div className="flex items-baseline justify-between gap-4 pb-1">
      <p className="text-sm font-medium tracking-tight text-foreground">{label}</p>
      {count > 0 ? (
        <span className="text-xs tabular-nums text-muted-foreground">{count}</span>
      ) : null}
    </div>
  );
}

type CategoryGridTileProps = {
  label: string;
  selected: boolean;
  mode: SpecificCategoryMode;
  disabled?: boolean;
  index?: number;
  onToggle: () => void;
  onModeChange: (mode: SpecificCategoryMode) => void;
};

export function CategoryGridTile({
  label,
  selected,
  mode,
  disabled = false,
  index = 0,
  onToggle,
  onModeChange,
}: CategoryGridTileProps) {
  const reducedMotion = prefersReducedMotion();
  const modeOptions = [
    {
      id: "tracked" as const,
      icon: Package,
      label: SETUP_WIZARD_COPY.categories.modeTracked,
      aria: SETUP_WIZARD_COPY.categories.modeTrackedAria,
    },
    {
      id: "quick" as const,
      icon: Zap,
      label: SETUP_WIZARD_COPY.categories.modeQuick,
      aria: SETUP_WIZARD_COPY.categories.modeQuickAria,
    },
  ];

  return (
    <motion.div
      layout={!reducedMotion}
      {...authJourneyStaggerItem(index, reducedMotion)}
      className={cn(
        "relative flex min-h-[5.25rem] flex-col justify-between rounded-xl border p-3.5 transition-colors duration-200",
        selected
          ? "border-primary/30 bg-primary/5"
          : "border-border/50 bg-card/30 hover:border-border hover:bg-muted/15",
        disabled && "pointer-events-none opacity-45",
      )}
    >
      <button
        type="button"
        disabled={disabled}
        onClick={onToggle}
        aria-pressed={selected}
        className="absolute inset-0 cursor-pointer rounded-xl"
      >
        <span className="sr-only">{label}</span>
      </button>

      <div className="pointer-events-none flex items-start justify-between gap-2">
        <span className="text-sm font-medium leading-snug tracking-tight">{label}</span>
        <span
          className={cn(
            "flex size-[1.125rem] shrink-0 items-center justify-center rounded-full border transition-colors",
            selected ? "border-primary bg-primary text-primary-foreground" : "border-border/70",
          )}
          aria-hidden
        >
          <AnimatePresence mode="wait">
            {selected ? (
              <motion.span
                key="check"
                initial={reducedMotion ? false : { scale: 0.4, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.4, opacity: 0 }}
                transition={{ duration: 0.18, ease: authJourneyEase }}
              >
                <Check className="size-2.5" strokeWidth={3} />
              </motion.span>
            ) : null}
          </AnimatePresence>
        </span>
      </div>

      <div
        className={cn(
          "relative z-10 mt-3 flex gap-1 transition-opacity duration-200",
          selected ? "opacity-100" : "pointer-events-none opacity-0",
        )}
        onClick={(event) => event.stopPropagation()}
      >
        {modeOptions.map((option) => {
          const Icon = option.icon;
          const active = mode === option.id;

          return (
            <button
              key={option.id}
              type="button"
              title={option.label}
              aria-label={option.aria}
              aria-pressed={active}
              onClick={() => onModeChange(option.id)}
              className={cn(
                "inline-flex flex-1 cursor-pointer items-center justify-center gap-1.5 rounded-lg border px-2 py-1 text-[11px] font-medium transition-colors duration-200",
                active
                  ? "border-primary/25 bg-primary text-primary-foreground"
                  : "border-border/50 bg-background/50 text-muted-foreground hover:text-foreground",
              )}
            >
              <Icon className="size-3" aria-hidden />
              {option.label}
            </button>
          );
        })}
      </div>
    </motion.div>
  );
}

type ModuleSelectRowProps = {
  title: string;
  selected: boolean;
  icon?: LucideIcon;
  disabled?: boolean;
  index?: number;
  onClick: () => void;
};

export function ModuleSelectRow({
  title,
  selected,
  icon: Icon,
  disabled = false,
  index = 0,
  onClick,
}: ModuleSelectRowProps) {
  const reducedMotion = prefersReducedMotion();

  return (
    <motion.button
      type="button"
      disabled={disabled}
      onClick={onClick}
      {...authJourneyStaggerItem(index, reducedMotion)}
      whileTap={reducedMotion ? undefined : { scale: 0.99 }}
      className={cn(
        "flex w-full cursor-pointer items-center gap-3 rounded-xl border px-4 py-3 text-left transition-colors duration-200",
        selected
          ? "border-primary/30 bg-primary/6"
          : "border-border/50 bg-transparent hover:border-border/80 hover:bg-muted/10",
        disabled && "pointer-events-none opacity-50",
      )}
    >
      {Icon ? (
        <span
          className={cn(
            "flex size-8 shrink-0 items-center justify-center rounded-lg border",
            selected
              ? "border-primary/20 bg-primary/10 text-primary"
              : "border-border/60 text-muted-foreground",
          )}
        >
          <Icon className="size-4" aria-hidden />
        </span>
      ) : null}
      <span className="min-w-0 flex-1 text-sm font-medium tracking-tight">{title}</span>
      <span
        className={cn(
          "flex size-5 shrink-0 items-center justify-center rounded-full border transition-colors",
          selected ? "border-primary bg-primary text-primary-foreground" : "border-border/70",
        )}
        aria-hidden
      >
        {selected ? <Check className="size-3" /> : null}
      </span>
    </motion.button>
  );
}

type WarrantySelectRowProps = {
  title: string;
  hint?: string;
  selected: boolean;
  index?: number;
  onClick: () => void;
};

export function WarrantySelectRow({
  title,
  hint,
  selected,
  index = 0,
  onClick,
}: WarrantySelectRowProps) {
  const reducedMotion = prefersReducedMotion();

  return (
    <motion.button
      type="button"
      onClick={onClick}
      {...authJourneyStaggerItem(index, reducedMotion)}
      whileTap={reducedMotion ? undefined : { scale: 0.99 }}
      className={cn(
        "flex w-full cursor-pointer items-center justify-between gap-4 rounded-xl border px-4 py-3.5 text-left transition-colors duration-200",
        selected
          ? "border-primary/30 bg-primary/6"
          : "border-border/50 hover:border-border/80 hover:bg-muted/10",
      )}
    >
      <span className="min-w-0">
        <span className="block text-sm font-medium tracking-tight">{title}</span>
        {hint ? <span className="mt-0.5 block text-xs text-muted-foreground">{hint}</span> : null}
      </span>
      <span
        className={cn(
          "flex size-5 shrink-0 items-center justify-center rounded-full border",
          selected ? "border-primary bg-primary text-primary-foreground" : "border-border/70",
        )}
        aria-hidden
      >
        {selected ? <Check className="size-3" /> : null}
      </span>
    </motion.button>
  );
}

type ModeToggleProps = {
  mode: SpecificCategoryMode;
  onChange: (mode: SpecificCategoryMode) => void;
  compact?: boolean;
};

export function CategoryModeToggle({ mode, onChange, compact = false }: ModeToggleProps) {
  const options = [
    { id: "tracked" as const, label: SETUP_WIZARD_COPY.categories.modeTracked },
    { id: "quick" as const, label: SETUP_WIZARD_COPY.categories.modeQuick },
  ];

  return (
    <div className={cn(compact ? "mt-3 pl-0" : "mt-3 pl-12")}>
      <div className="inline-flex rounded-full border border-border/60 bg-muted/20 p-0.5">
        {options.map((option) => (
          <button
            key={option.id}
            type="button"
            onClick={() => onChange(option.id)}
            className={cn(
              "cursor-pointer rounded-full px-3 py-1 text-xs font-medium transition-colors duration-200",
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
  embedded?: boolean;
};

export function SetupWizardSuccess({ onDone, embedded = false }: SetupWizardSuccessProps) {
  const card = (
    <motion.div
      className={cn(
        "flex flex-col items-center gap-6 rounded-2xl border border-border/60 bg-card/60 text-center",
        embedded ? "px-6 py-14" : "px-6 py-16 shadow-sm",
      )}
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
  );

  if (embedded) {
    return card;
  }

  return <SetupWizardShell>{card}</SetupWizardShell>;
}

export type { SetupWizardStepMeta };
