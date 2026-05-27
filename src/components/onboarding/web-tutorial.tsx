"use client";

import {
  Cloud,
  FolderKanban,
  LayoutGrid,
  Receipt,
  Sparkles,
  Table2,
} from "lucide-react";
import { useMemo, useState } from "react";

import { AppLogo } from "@/components/brand/app-logo";
import { Button } from "@/components/ui/button";
import { userCopy } from "@/lib/user-copy";
import { cn } from "@/lib/utils";

type WebTutorialStep = {
  id: number;
  icon: typeof Sparkles;
  iconClassName: string;
  title: string;
  description: string;
  hint?: string;
};

type WebTutorialProps = {
  onComplete: () => void;
};

export function WebTutorial({ onComplete }: WebTutorialProps) {
  const [step, setStep] = useState(0);
  const [animKey, setAnimKey] = useState(0);

  const steps = useMemo<WebTutorialStep[]>(
    () => [
      {
        id: 0,
        icon: Sparkles,
        iconClassName: "text-primary",
        title: userCopy.onboarding.welcomeTitle,
        description: userCopy.onboarding.welcomeDescription,
        hint: userCopy.onboarding.welcomeHint,
      },
      {
        id: 1,
        icon: Table2,
        iconClassName: "text-indigo-500",
        title: userCopy.onboarding.gridTitle,
        description: userCopy.onboarding.gridDescription,
        hint: userCopy.onboarding.gridHint,
      },
      {
        id: 2,
        icon: LayoutGrid,
        iconClassName: "text-violet-500",
        title: userCopy.onboarding.sidebarTitle,
        description: userCopy.onboarding.sidebarDescription,
      },
      {
        id: 3,
        icon: Receipt,
        iconClassName: "text-emerald-500",
        title: userCopy.onboarding.accountingTitle,
        description: userCopy.onboarding.accountingDescription,
      },
      {
        id: 4,
        icon: Cloud,
        iconClassName: "text-sky-500",
        title: userCopy.onboarding.syncTitle,
        description: userCopy.onboarding.syncDescription,
      },
      {
        id: 5,
        icon: FolderKanban,
        iconClassName: "text-amber-500",
        title: userCopy.onboarding.readyTitle,
        description: userCopy.onboarding.readyDescription,
      },
    ],
    [],
  );

  const current = steps[step]!;
  const Icon = current.icon;
  const isLast = step === steps.length - 1;

  function goTo(nextStep: number) {
    setStep(nextStep);
    setAnimKey((value) => value + 1);
  }

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center overflow-hidden bg-background p-4">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_15%_15%,rgba(10,115,242,0.16),transparent_42%),radial-gradient(circle_at_85%_10%,rgba(16,185,129,0.12),transparent_38%),radial-gradient(circle_at_50%_100%,rgba(99,102,241,0.1),transparent_45%)]" />

      <div className="relative flex w-full max-w-2xl flex-col overflow-hidden rounded-3xl border bg-card/95 shadow-2xl backdrop-blur-md animate-autocore-auth-card-enter motion-reduce:animate-none">
        <div className="flex items-center justify-between border-b px-5 py-4">
          <div className="flex items-center gap-3">
            <AppLogo size={36} priority />
            <div>
              <p className="text-sm font-semibold">{userCopy.onboarding.title}</p>
              <p className="text-xs text-muted-foreground">
                {userCopy.onboarding.stepCounter(step + 1, steps.length)}
              </p>
            </div>
          </div>
          <Button variant="ghost" size="sm" onClick={onComplete}>
            {userCopy.onboarding.skip}
          </Button>
        </div>

        <div key={animKey} className="flex min-h-[420px] flex-col px-6 py-8 md:px-10">
          <div className="flex flex-1 flex-col items-center justify-center text-center">
            <div className="relative mb-8">
              <div className="absolute inset-0 animate-ping rounded-full bg-primary/10 motion-reduce:animate-none" />
              <div className="relative flex size-28 items-center justify-center rounded-full bg-muted/60 animate-autocore-logo-enter motion-reduce:animate-none">
                <Icon className={cn("size-12", current.iconClassName)} aria-hidden="true" />
              </div>
            </div>

            <h2 className="max-w-lg text-2xl font-semibold tracking-tight animate-autocore-fade-in-up motion-reduce:animate-none">
              {current.title}
            </h2>
            <p className="mt-3 max-w-xl text-sm leading-6 text-muted-foreground animate-autocore-fade-in-up motion-reduce:animate-none [animation-delay:80ms]">
              {current.description}
            </p>
            {current.hint ? (
              <p className="mt-4 rounded-full border bg-muted/40 px-4 py-1.5 text-xs text-muted-foreground animate-autocore-fade-in-up motion-reduce:animate-none [animation-delay:140ms]">
                {current.hint}
              </p>
            ) : null}
          </div>

          <div className="mt-8 flex items-center justify-center gap-2">
            {steps.map((item, index) => (
              <button
                key={item.id}
                type="button"
                aria-label={`Шаг ${index + 1}`}
                onClick={() => goTo(index)}
                className={cn(
                  "h-2 rounded-full transition-all duration-300",
                  index === step ? "w-7 bg-primary" : "w-2 bg-muted-foreground/30 hover:bg-muted-foreground/50",
                )}
              />
            ))}
          </div>
        </div>

        <div className="flex items-center justify-between border-t px-5 py-4">
          <Button variant="ghost" disabled={step === 0} onClick={() => goTo(step - 1)}>
            {userCopy.onboarding.back}
          </Button>
          <Button
            onClick={() => {
              if (isLast) {
                onComplete();
                return;
              }
              goTo(step + 1);
            }}
          >
            {isLast ? userCopy.onboarding.start : userCopy.onboarding.next}
          </Button>
        </div>
      </div>
    </div>
  );
}
