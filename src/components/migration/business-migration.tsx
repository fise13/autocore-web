"use client";

import { useMemo, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { ArrowLeft, ArrowRight, LifeBuoy, Loader2, Sparkles, X } from "lucide-react";

import { Button } from "@/components/ui/button";
import { TooltipProvider } from "@/components/ui/tooltip";
import { useToast } from "@/components/ui/toast-provider";
import { cn } from "@/lib/utils";
import type { DomainCategory } from "@/lib/domain/types";
import type { DomainDictionary } from "@/lib/domain/domain-dictionary";

import { DetectedFieldsPanel } from "./detected-fields-panel";
import { DuplicatesPanel } from "./duplicates-panel";
import { MigrationCompleteView } from "./migration-complete";
import { MigrationDropzone } from "./migration-dropzone";
import { MigrationProgressView } from "./migration-progress";
import { MigrationSupportDialog } from "./migration-support-dialog";
import type { MigrationCommitPort, MigrationLearnFn } from "./migration-types";
import { PhotosStrip } from "./photos-strip";
import { RecognitionSummaryView } from "./recognition-summary";
import { ReviewGrid } from "./review-grid";
import { createSimulatedCommitPort } from "./simulated-commit-port";
import { useBusinessMigration } from "./use-business-migration";

export type BusinessMigrationProps = {
  /** Standalone `/migration` route vs full-screen onboarding step. */
  variant?: "standalone" | "onboarding";
  companyId?: string;
  companyName?: string;
  userEmail?: string;
  getCompanyDictionary?: (category: DomainCategory) => DomainDictionary | null;
  onLearn?: MigrationLearnFn;
  commitPort?: MigrationCommitPort;
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
  const reviewMaxWidth = isOnboarding ? "max-w-[min(100%,90rem)]" : "max-w-6xl";

  const fallbackPort = useMemo(() => createSimulatedCommitPort(), []);
  const commitPort = props.commitPort ?? fallbackPort;

  const m = useBusinessMigration({
    commitPort,
    companyId: props.companyId,
    getCompanyDictionary: props.getCompanyDictionary,
    onLearn: props.onLearn,
  });

  const attachedPaths = useMemo(
    () => new Set(m.rows.filter((row) => row.photo).map((row) => row.photo!.path)),
    [m.rows],
  );

  // "Start over" only mid-flow; exit to the app only when nothing is in progress
  // (the brief: never bounce the user back to Motors until migration finishes).
  const canStartOver = m.phase === "recognition" || m.phase === "review" || m.phase === "error";
  const canExit =
    !isOnboarding && (m.phase === "idle" || m.phase === "completed" || m.phase === "error");
  const canManualSkip =
    isOnboarding &&
    props.onManualSetup &&
    (m.phase === "idle" || m.phase === "recognition" || m.phase === "error");

  const handleAttachPhotoPath = (rowId: string, path: string) => {
    const image = m.images.find((item) => item.path === path);
    if (image) m.attachPhoto(rowId, image);
  };

  const saveProfile = () => {
    if (typeof window !== "undefined" && props.companyId) {
      window.localStorage.setItem(
        `autocore:import-profile:${props.companyId}`,
        JSON.stringify({ mappings: m.mappings, savedAt: Date.now() }),
      );
    }
    toast({
      title: "Профиль импорта сохранён",
      description: "Следующая загрузка пройдёт быстрее — сопоставление переиспользуется.",
      variant: "success",
    });
  };

  return (
    <TooltipProvider delay={150}>
      <div className="flex min-h-[100dvh] flex-col bg-background">
        {/* Top bar */}
        <header className="sticky top-0 z-20 flex h-14 shrink-0 items-center justify-between border-b bg-background/80 px-4 backdrop-blur-sm">
          <div className="flex items-center gap-2.5">
            {canStartOver && (
              <Button variant="ghost" size="icon-sm" aria-label="Начать заново" onClick={m.reset}>
                <ArrowLeft />
              </Button>
            )}
            <span className="flex items-center gap-2 font-heading text-sm font-medium">
              <Sparkles className="size-4 text-emerald-600" />
              Перенос в AutoCore
            </span>
          </div>
          <div className="flex items-center gap-1">
            {canManualSkip && (
              <Button variant="outline" size="sm" onClick={props.onManualSetup}>
                Всё вручную
              </Button>
            )}
            <Button variant="ghost" size="sm" onClick={() => setSupportOpen(true)}>
              <LifeBuoy data-icon="inline-start" />
              Не получается импортировать?
            </Button>
            {canExit && props.onExit && (
              <Button
                variant="ghost"
                size="icon-sm"
                aria-label="Закрыть и вернуться в AutoCore"
                title="Вернуться в AutoCore"
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
                <MigrationDropzone onFiles={m.acceptFiles} />
                {canManualSkip && (
                  <div className="flex justify-center pb-10">
                    <Button variant="ghost" size="sm" onClick={props.onManualSetup}>
                      Заполню всё вручную позже
                    </Button>
                  </div>
                )}
              </motion.div>
            )}

            {m.phase === "analyzing" && (
              <motion.div key="analyzing" {...fade}>
                <AnalyzingState fileNames={m.fileNames} />
              </motion.div>
            )}

            {m.phase === "recognition" && m.recognition && (
              <motion.div key="recognition" {...fade}>
                <RecognitionSummaryView
                  summary={m.recognition}
                  fileNames={m.fileNames}
                  onContinue={m.continueToReview}
                />
              </motion.div>
            )}

            {m.phase === "review" && (
              <motion.div key="review" {...fade} className={cn("mx-auto flex w-full flex-col gap-4 px-4 py-6 md:px-6", reviewMaxWidth)}>
                <div className="flex flex-col gap-1">
                  <h2 className="font-heading text-xl font-semibold tracking-tight">
                    Проверьте, что AutoCore понял
                  </h2>
                  <p className="text-sm text-muted-foreground">
                    Зелёные строки готовы к переносу. Жёлтые стоит проверить — наведите на процент, чтобы
                    увидеть почему.
                  </p>
                </div>

                <DetectedFieldsPanel mappings={m.mappings} />
                <DuplicatesPanel duplicates={m.duplicates} onSetResolution={m.setDuplicateResolution} />
                <PhotosStrip images={m.images} attachedPaths={attachedPaths} />

                <ReviewGrid
                  rows={m.rows}
                  selection={m.selection}
                  onToggleSelect={m.toggleSelect}
                  onSelectAll={m.selectAll}
                  onClearSelection={m.clearSelection}
                  onSetRowType={m.setRowType}
                  onApplySuggestion={m.applySuggestion}
                  onSetRowValue={m.setRowValue}
                  onAttachPhotoPath={handleAttachPhotoPath}
                  onSkip={m.skipRows}
                  onRestore={m.restoreRows}
                  onDelete={m.deleteRows}
                  onAcceptAllSuggestions={m.acceptAllSuggestions}
                />

                <div className="sticky bottom-0 -mx-4 flex items-center justify-between gap-3 border-t bg-background/90 px-4 py-3 backdrop-blur-sm">
                  <span className="text-sm text-muted-foreground">
                    К переносу: <strong className="font-medium text-foreground">{m.pendingCount}</strong> позиций
                  </span>
                  <Button size="lg" onClick={m.startMigration} disabled={m.pendingCount === 0}>
                    Перенести в AutoCore
                    <ArrowRight data-icon="inline-end" />
                  </Button>
                </div>
              </motion.div>
            )}

            {m.phase === "migrating" && (
              <motion.div key="migrating" {...fade}>
                <MigrationProgressView progress={m.progress} onCancel={m.cancelMigration} />
              </motion.div>
            )}

            {m.phase === "completed" && m.result && (
              <motion.div key="completed" {...fade}>
                <MigrationCompleteView
                  result={m.result}
                  canUndo={m.canUndo}
                  variant={isOnboarding ? "onboarding" : "standalone"}
                  onUndo={() => void m.undo()}
                  onOpenMotors={props.onOpenMotors ?? (() => {})}
                  onOpenWarehouse={props.onOpenWarehouse ?? (() => {})}
                  onSaveProfile={saveProfile}
                  onReset={m.reset}
                />
              </motion.div>
            )}

            {m.phase === "error" && (
              <motion.div key="error" {...fade}>
                <ErrorState
                  title={m.error?.includes("Миграция") || m.error?.includes("сохран") || m.error?.includes("прав") ? "Не удалось сохранить данные" : "Не получилось разобрать файл"}
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

function AnalyzingState({ fileNames }: { fileNames: string[] }) {
  return (
    <div className="mx-auto flex w-full max-w-md flex-col items-center gap-4 px-6 py-24 text-center">
      <div className="flex size-14 items-center justify-center rounded-2xl bg-emerald-500/10 text-emerald-600">
        <Loader2 className="size-7 animate-spin" />
      </div>
      <div className="flex flex-col gap-1">
        <h2 className="font-heading text-xl font-semibold tracking-tight">Изучаем ваш файл</h2>
        <p className="text-sm text-muted-foreground">
          Читаем {fileNames[0]}, ищем двигатели, запчасти и фотографии…
        </p>
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
          {message ?? "Что-то пошло не так. Попробуйте другой файл."}
        </p>
      </div>
      <div className="flex items-center gap-2">
        <Button variant="outline" onClick={onSupport}>
          <LifeBuoy data-icon="inline-start" />
          Запросить помощь
        </Button>
        <Button onClick={onRetry}>Попробовать другой файл</Button>
      </div>
    </div>
  );
}
