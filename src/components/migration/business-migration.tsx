"use client";

import { useMemo, useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import { ArrowLeft, ArrowRight, LoaderCircle, MessageCircleQuestionMark, Sparkles, X } from "lucide-react";

import { Button } from "@/components/ui/button";
import { TooltipProvider } from "@/components/ui/tooltip";
import { useToast } from "@/components/ui/toast-provider";
import { userCopy } from "@/lib/user-copy";
import { cn } from "@/lib/utils";
import type { DomainCategory } from "@/lib/domain/types";
import type { DomainDictionary } from "@/lib/domain/domain-dictionary";

import { ImportCompleteView } from "./import-complete";
import { MigrationDropzone } from "./migration-dropzone";
import { MigrationSupportDialog } from "./migration-support-dialog";
import type { MigrationLearnFn } from "./migration-types";
import { PlanPreview } from "./plan-preview";
import { PHASE_MESSAGES, useBusinessImport } from "./use-business-import";

export type BusinessMigrationProps = {
  /** Standalone `/migration` route vs full-screen onboarding step. */
  variant?: "standalone" | "onboarding";
  companyId?: string;
  companyName?: string;
  userEmail?: string;
  getCompanyDictionary?: (category: DomainCategory) => DomainDictionary | null;
  onLearn?: MigrationLearnFn;
  onOpenMotors?: () => void;
  onOpenWarehouse?: () => void;
  /** Skip import and enter the app manually (onboarding only). */
  onManualSetup?: () => void;
  /** Leave the migration surface and return to the app. */
  onExit?: () => void;
};

const fade = {
  initial: { opacity: 0, y: 8 },
  animate: { opacity: 1, y: 0 },
  exit: { opacity: 0, y: -8 },
  transition: { duration: 0.28, ease: [0.16, 1, 0.3, 1] as const },
};

export function BusinessMigration(props: BusinessMigrationProps) {
  const { toast } = useToast();
  const [supportOpen, setSupportOpen] = useState(false);
  const isOnboarding = props.variant === "onboarding";
  const reviewMaxWidth = isOnboarding ? "max-w-[min(100%,90rem)]" : "max-w-4xl";

  const m = useBusinessImport({ companyId: props.companyId });

  // "Start over" only mid-flow; exit to the app only when nothing is in progress
  // (the brief: never bounce the user back to Motors until migration finishes).
  const canStartOver = m.phase === "ready" || m.phase === "error";
  const canExit =
    !isOnboarding &&
    (m.phase === "idle" || m.phase === "completed" || m.phase === "partial" || m.phase === "error");
  const canManualSkip =
    isOnboarding &&
    props.onManualSetup &&
    (m.phase === "idle" || m.phase === "ready" || m.phase === "error");
  const mCopy = userCopy.migration;
  const shellTitle = isOnboarding ? mCopy.shellTitleOnboarding : mCopy.shellTitleStandalone;
  const shellSubtitle = isOnboarding
    ? mCopy.shellSubtitleOnboarding
    : mCopy.shellSubtitleStandalone;

  const handleImport = () => {
    if (m.unansweredMerges.length > 0) {
      toast({
        title: "Есть неразрешённые объединения",
        description: "Объединение записей необратимо — подтвердите или оставьте их раздельно.",
        variant: "default",
      });
      return;
    }
    void m.startImport();
  };

  return (
    <TooltipProvider delay={150}>
      <div
        className={cn(
          "flex min-h-[100dvh] flex-col",
          isOnboarding
            ? "fixed inset-0 z-10 overflow-y-auto bg-background/70 backdrop-blur-md"
            : "bg-background",
        )}
      >
        {/* Top bar */}
        <header
          className={cn(
            "sticky top-0 z-20 flex h-14 shrink-0 items-center justify-between border-b px-4 backdrop-blur-sm",
            isOnboarding ? "border-border/60 bg-background/50" : "bg-background/80",
          )}
        >
          <div className="flex items-center gap-2.5">
            {canStartOver && (
              <Button variant="ghost" size="icon-sm" aria-label={mCopy.startOverAria} onClick={m.reset}>
                <ArrowLeft />
              </Button>
            )}
            <span className="flex items-center gap-2 font-heading text-sm font-medium">
              <Sparkles className="size-4 text-success-on-subtle" />
              {shellTitle}
            </span>
          </div>
          <div className="flex items-center gap-1">
            {canManualSkip && (
              <Button variant="outline" size="sm" onClick={props.onManualSetup}>
                {mCopy.allManual}
              </Button>
            )}
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setSupportOpen(true)}
              className="text-muted-foreground hover:text-foreground"
            >
              <MessageCircleQuestionMark
                data-icon="inline-start"
                className="size-3.5 opacity-80 transition-opacity group-hover/button:opacity-100"
                strokeWidth={1.75}
              />
              {mCopy.needHelp}
            </Button>
            {canExit && props.onExit && (
              <Button
                variant="ghost"
                size="icon-sm"
                aria-label={mCopy.exitAria}
                title={mCopy.exitTitle}
                onClick={props.onExit}
              >
                <X />
              </Button>
            )}
          </div>
        </header>

        <main className="flex-1">
          <AnimatePresence mode="wait">
            {m.phase === "idle" && (
              <motion.div key="idle" {...fade} className="flex flex-col">
                {isOnboarding ? (
                  <div className="mx-auto flex w-full max-w-3xl flex-col gap-3 px-6 pb-6 pt-8 text-center">
                    <div className="mx-auto inline-flex items-center gap-2 rounded-full border border-success-border bg-success-subtle px-3 py-1 text-micro font-medium text-success-on-subtle">
                      <Sparkles className="size-3.5" aria-hidden />
                      {mCopy.finalStep}
                    </div>
                    <div className="space-y-2">
                      <h1 className="font-heading text-3xl font-semibold tracking-tight sm:text-4xl">
                        {mCopy.onboardingHeadline}
                      </h1>
                      <p className="mx-auto max-w-2xl text-sm leading-relaxed text-muted-foreground sm:text-base">
                        {shellSubtitle}
                      </p>
                    </div>
                  </div>
                ) : null}
                <MigrationDropzone onFiles={m.acceptFiles} />
                {canManualSkip && (
                  <div className="flex justify-center pb-10">
                    <Button variant="ghost" size="sm" onClick={props.onManualSetup}>
                      {mCopy.fillLater}
                    </Button>
                  </div>
                )}
              </motion.div>
            )}

            {(m.phase === "parsing" || m.phase === "analyzing") && (
              <motion.div key="analyzing" {...fade}>
                <AnalyzingState phase={m.phase} fileNames={m.fileNames} />
              </motion.div>
            )}

            {m.phase === "ready" && m.presentation && (
              <motion.div
                key="ready"
                {...fade}
                className={cn("mx-auto flex w-full flex-col gap-4 px-4 py-6 md:px-6", reviewMaxWidth)}
              >
                <PlanPreview
                  plan={m.presentation}
                  onImport={handleImport}
                  mergeDecisions={m.mergeDecisions}
                  onDecideMerge={m.decideMerge}
                  blockedByMerges={m.unansweredMerges.length}
                />
              </motion.div>
            )}

            {m.phase === "committing" && (
              <motion.div key="committing" {...fade}>
                <CommittingState progress={m.progress} />
              </motion.div>
            )}

            {(m.phase === "completed" || m.phase === "partial") && m.commitResult && (
              <motion.div key="completed" {...fade}>
                <ImportCompleteView
                  result={m.commitResult.result}
                  status={m.commitResult.status}
                  deferred={m.commitResult.deferred}
                  onResume={() => void m.resumeImport()}
                  onOpenMotors={props.onOpenMotors ?? (() => {})}
                  onOpenWarehouse={props.onOpenWarehouse ?? (() => {})}
                  onReset={m.reset}
                />
              </motion.div>
            )}

            {m.phase === "error" && (
              <motion.div key="error" {...fade}>
                <ErrorState
                  title={
                    m.error?.includes("Миграция") ||
                    m.error?.includes("migration") ||
                    m.error?.includes("сохран") ||
                    m.error?.includes("save") ||
                    m.error?.includes("прав") ||
                    m.error?.includes("permission")
                      ? mCopy.saveFailedTitle
                      : mCopy.parseFailedTitle
                  }
                  message={m.error}
                  onRetry={m.reset}
                  onSupport={() => setSupportOpen(true)}
                />
              </motion.div>
            )}
          </AnimatePresence>
        </main>

        <MigrationSupportDialog
          open={supportOpen}
          onOpenChange={setSupportOpen}
          companyName={props.companyName}
          email={props.userEmail}
        />
      </div>
    </TooltipProvider>
  );
}

function AnalyzingState({
  phase,
  fileNames,
}: {
  phase: "parsing" | "analyzing";
  fileNames: string[];
}) {
  return (
    <div className="mx-auto flex w-full max-w-md flex-col items-center gap-4 px-6 py-24 text-center">
      <div className="flex size-14 items-center justify-center rounded-2xl bg-success-subtle text-success-on-subtle">
        <LoaderCircle className="size-7 animate-spin" />
      </div>
      <div className="flex flex-col gap-1">
        <h2 className="font-heading text-xl font-semibold tracking-tight">
          {userCopy.migration.analyzingTitle}
        </h2>
        {/* Names the actual stage: understanding a business takes longer than
            reading a file, and silence for that long reads as a hang. */}
        <p className="text-sm text-muted-foreground">{PHASE_MESSAGES[phase]}</p>
        {fileNames[0] ? (
          <p className="text-xs text-muted-foreground">{fileNames.join(", ")}</p>
        ) : null}
      </div>
    </div>
  );
}

function CommittingState({ progress }: { progress: { done: number; total: number } | null }) {
  const total = progress?.total ?? 0;
  const done = progress?.done ?? 0;
  const percent = total > 0 ? Math.min(100, Math.round((done / total) * 100)) : 0;
  return (
    <div className="mx-auto flex w-full max-w-md flex-col items-center gap-4 px-6 py-24 text-center">
      <div className="flex size-14 items-center justify-center rounded-2xl bg-success-subtle text-success-on-subtle">
        <LoaderCircle className="size-7 animate-spin" />
      </div>
      <div className="flex w-full flex-col gap-2">
        <h2 className="font-heading text-xl font-semibold tracking-tight">
          {PHASE_MESSAGES.committing}
        </h2>
        {total > 0 ? (
          <>
            <div className="h-2 w-full overflow-hidden rounded-full bg-muted">
              <div
                className="h-full rounded-full bg-success transition-[width] duration-300"
                style={{ width: `${percent}%` }}
              />
            </div>
            <p className="text-sm text-muted-foreground tabular-nums">
              {done} / {total}
            </p>
          </>
        ) : null}
      </div>
    </div>
  );
}

function ErrorState({
  title,
  message,
  onRetry,
  onSupport,
}: {
  title: string;
  message: string | null;
  onRetry: () => void;
  onSupport: () => void;
}) {
  return (
    <div className="mx-auto flex w-full max-w-md flex-col items-center gap-5 px-6 py-24 text-center">
      <div className="flex flex-col gap-2">
        <h2 className="font-heading text-xl font-semibold tracking-tight">{title}</h2>
        <p className={cn("text-sm text-muted-foreground")}>
          {message ?? userCopy.migration.errorFallback}
        </p>
      </div>
      <div className="flex items-center gap-2">
        <Button variant="outline" onClick={onSupport}>
          <MessageCircleQuestionMark data-icon="inline-start" className="size-3.5" strokeWidth={2} />
          {userCopy.migration.requestHelp}
        </Button>
        <Button onClick={onRetry}>{userCopy.migration.tryAnotherFile}</Button>
      </div>
    </div>
  );
}
