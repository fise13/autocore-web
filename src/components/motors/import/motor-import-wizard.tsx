"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { ChevronDown, Sparkles } from "lucide-react";

import { useWorkspace } from "@/components/layout/workspace-context";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ConfidenceBadge } from "@/components/warehouse/import/shared/confidence-badge";
import { ImportProgressBar } from "@/components/warehouse/import/shared/import-progress-bar";
import { useToast } from "@/components/ui/toast-provider";
import { formatMotorDate } from "@/lib/motor-dates";
import { SheetImportType } from "@/lib/motors/excel-sheet-config";
import { ExcelSheetData, MotorExcelImportResult } from "@/lib/motors/excel-types";
import {
  MotorImportPreviewResult,
  MotorImportPreviewRow,
  MotorImportProgress,
  MotorSheetMappingResult,
} from "@/lib/motors/import/types";
import { cn } from "@/lib/utils";
import { userCopy } from "@/lib/user-copy";

type WizardStep = "analyze" | "review" | "mapping" | "confirm";

type ResumeSession = {
  jobId: string;
  preview: MotorImportPreviewResult;
};

type MotorImportWizardProps = {
  sheets: ExcelSheetData[];
  sourceFileName?: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  useAi: boolean;
  resumeSession?: ResumeSession | null;
  onOpenHistory?: () => void;
  onDismiss?: () => void;
  onReviewPending?: (pending: boolean) => void;
  onAnalyze: (input: {
    sheets: ExcelSheetData[];
    sourceFileName?: string;
    manualSheetMappings?: Record<string, MotorSheetMappingResult>;
    onProgress?: (progress: MotorImportProgress) => void;
  }) => Promise<MotorImportPreviewResult & { jobId: string }>;
  onApply: (input: {
    jobId: string;
    preview: MotorImportPreviewResult;
    onProgress?: (progress: { applied: number; failed: number; total: number; percent: number }) => void;
    shouldCancel?: () => boolean;
  }) => Promise<MotorExcelImportResult & { cancelled?: boolean }>;
  onComplete: (result: MotorExcelImportResult) => void;
};

const stepOrder: WizardStep[] = ["analyze", "review", "confirm"];
const stepLabels: Record<WizardStep, string> = {
  analyze: "Анализ",
  review: "Проверка",
  mapping: "Листы",
  confirm: "Импорт",
};

const stepHints: Record<WizardStep, string> = {
  analyze: "ИИ найдёт листы двигателей и специфичные каталоги (КПП, раздатки, ЭБУ…) — колонки, бренды, комплектации и даты",
  review: "Снимите галочки с лишних строк или откройте настройки листов",
  mapping: "Уточните тип листов, бренд и категорию специфичных таблиц",
  confirm: "Можно закрыть окно — загрузка продолжится, прогресс будет сверху",
};

const importTypeOptions: { value: SheetImportType; label: string }[] = [
  { value: "engines", label: "Двигатели" },
  { value: "specific", label: "Специфичный каталог" },
  { value: "skip", label: "Пропустить" },
];

function actionLabel(action: MotorImportPreviewRow["action"]): string {
  switch (action) {
    case "create":
      return "Создание";
    case "update":
      return "Обновление";
    case "skip":
      return "Пропуск";
    default:
      return action;
  }
}

export function MotorImportWizard({
  sheets,
  sourceFileName,
  open,
  onOpenChange,
  useAi,
  resumeSession,
  onOpenHistory,
  onDismiss,
  onReviewPending,
  onAnalyze,
  onApply,
  onComplete,
}: MotorImportWizardProps) {
  const { motorImportProgress, setMotorImportProgress, registerMotorImportCancel } = useWorkspace();
  const { toast } = useToast();
  const cancelRef = useRef(false);
  const runningInBackgroundRef = useRef(false);
  const analyzingRef = useRef(false);
  const lastAnalyzedSheetsKeyRef = useRef<string | null>(null);
  const analyzeStartedForKeyRef = useRef<string | null>(null);
  const [step, setStep] = useState<WizardStep>("analyze");
  const [showMapping, setShowMapping] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [progress, setProgress] = useState<MotorImportProgress | null>(null);
  const [applyProgress, setApplyProgress] = useState<number | null>(null);
  const [preview, setPreview] = useState<(MotorImportPreviewResult & { jobId: string }) | null>(null);
  const [engineRows, setEngineRows] = useState<MotorImportPreviewRow[]>([]);
  const [sheetMappings, setSheetMappings] = useState<Record<string, MotorSheetMappingResult>>({});

  const uncertainRows = useMemo(
    () =>
      engineRows.filter((row) =>
        row.aiMeta?.warnings.some((warning) => warning.includes("не уверен")),
      ),
    [engineRows],
  );
  const duplicateRows = useMemo(
    () => engineRows.filter((row) => Boolean(row.duplicateOfMotorId)),
    [engineRows],
  );
  const selectedCount = useMemo(
    () => engineRows.filter((row) => row.selected && row.errors.length === 0).length,
    [engineRows],
  );
  const hasSpecificSheets = useMemo(
    () => Object.values(sheetMappings).some((item) => item.config.importType === "specific"),
    [sheetMappings],
  );
  const engineSheetCount = useMemo(
    () => Object.values(sheetMappings).filter((item) => item.config.importType === "engines").length,
    [sheetMappings],
  );
  const sheetsKey = useMemo(
    () => sheets.map((sheet) => `${sheet.name}:${sheet.rows.length}`).join("|"),
    [sheets],
  );

  function pushGlobalProgress(
    phase: "analyze" | "apply",
    next: { percent: number; message: string },
  ) {
    setMotorImportProgress({
      phase,
      percent: next.percent,
      message: next.message,
      fileName: sourceFileName,
    });
  }

  function syncReviewPending(nextOpen: boolean, nextStep: WizardStep = step) {
    if (!onReviewPending) return;
    const pending = !nextOpen && Boolean(preview) && nextStep === "review" && !loading && !motorImportProgress;
    onReviewPending(pending);
  }

  const cancelImport = useCallback(() => {
    cancelRef.current = true;
    runningInBackgroundRef.current = false;
    registerMotorImportCancel(null);
    setMotorImportProgress(null);
    setLoading(false);
    setProgress(null);
    setApplyProgress(null);
    setError(null);
    setPreview(null);
    setEngineRows([]);
    setSheetMappings({});
    setStep("analyze");
    setShowMapping(false);
    lastAnalyzedSheetsKeyRef.current = null;
    analyzeStartedForKeyRef.current = null;
    onReviewPending?.(false);
    onOpenChange(false);
    onDismiss?.();
  }, [onDismiss, onOpenChange, onReviewPending, registerMotorImportCancel, setMotorImportProgress]);

  useEffect(() => {
    if (!motorImportProgress) return;
    registerMotorImportCancel(cancelImport);
    return () => registerMotorImportCancel(null);
  }, [cancelImport, registerMotorImportCancel]);

  function resetState() {
    runningInBackgroundRef.current = false;
    setStep("analyze");
    setShowMapping(false);
    setLoading(false);
    setError(null);
    setProgress(null);
    setApplyProgress(null);
    setPreview(null);
    setEngineRows([]);
    setSheetMappings({});
    cancelRef.current = false;
    lastAnalyzedSheetsKeyRef.current = null;
    analyzeStartedForKeyRef.current = null;
    registerMotorImportCancel(null);
    setMotorImportProgress(null);
    onDismiss?.();
  }

  async function runApplyInBackground(
    jobPreview: MotorImportPreviewResult & { jobId: string },
    rows: MotorImportPreviewRow[],
    mappings: Record<string, MotorSheetMappingResult>,
  ) {
    setLoading(true);
    setError(null);
    cancelRef.current = false;
    runningInBackgroundRef.current = true;
    pushGlobalProgress("apply", { percent: 0, message: "Загружаем моторы в базу…" });
    onOpenChange(false);

    try {
      const result = await onApply({
        jobId: jobPreview.jobId,
        preview: { ...jobPreview, engineRows: rows, sheetMappings: mappings },
        onProgress: (value) => {
          setApplyProgress(value.percent);
          pushGlobalProgress("apply", {
            percent: value.percent,
            message: `Загрузка в базу · ${value.applied}/${value.total}`,
          });
        },
        shouldCancel: () => cancelRef.current,
      });

      if (!result.cancelled) {
        onComplete(result);
        const parts = [`${result.imported} моторов загружено`];
        if (result.specificRecordsImported) {
          parts.push(`${result.specificRecordsImported} специфичных`);
        }
        if (result.errors.length) {
          parts.push(`ошибок: ${result.errors.length}`);
        }
        toast({
          title: userCopy.motors.magicImportDone,
          description: parts.join(" · "),
          variant: result.errors.length ? "default" : "success",
          durationMs: 8000,
        });
      }

      resetState();
      onReviewPending?.(false);
    } catch (applyError) {
      if (cancelRef.current) return;
      runningInBackgroundRef.current = false;
      setMotorImportProgress(null);
      setError(applyError instanceof Error ? applyError.message : "Ошибка загрузки в базу");
      onOpenChange(true);
    } finally {
      setLoading(false);
      setApplyProgress(null);
    }
  }

  async function runAnalyze(
    manualSheetMappings?: Record<string, MotorSheetMappingResult>,
    options?: { autoApply?: boolean; closeDialog?: boolean },
  ) {
    if (sheets.length === 0 || analyzingRef.current) return;

    analyzingRef.current = true;
    setLoading(true);
    setError(null);
    cancelRef.current = false;
    const shouldClose = options?.closeDialog ?? true;

    if (shouldClose) {
      runningInBackgroundRef.current = true;
      pushGlobalProgress("analyze", { percent: 2, message: "Читаем листы Excel…" });
      onOpenChange(false);
    }

    try {
      const result = await onAnalyze({
        sheets,
        sourceFileName,
        manualSheetMappings,
        onProgress: (value) => {
          setProgress(value);
          if (shouldClose) {
            pushGlobalProgress("analyze", { percent: value.percent, message: value.message ?? "" });
          }
        },
      });

      if (cancelRef.current) {
        setLoading(false);
        setProgress(null);
        return;
      }

      setPreview(result);
      setEngineRows(result.engineRows);
      setSheetMappings(result.sheetMappings);
      lastAnalyzedSheetsKeyRef.current = sheetsKey;

      const autoApply = options?.autoApply ?? result.quickImport;
      if (autoApply && result.stats.validEngineRows > 0) {
        runningInBackgroundRef.current = false;
        setMotorImportProgress(null);
        await runApplyInBackground(result, result.engineRows, result.sheetMappings);
        return;
      }

      runningInBackgroundRef.current = false;
      setMotorImportProgress(null);
      setStep("review");
      setShowMapping(false);
      onOpenChange(true);
    } catch (analyzeError) {
      if (cancelRef.current) return;
      runningInBackgroundRef.current = false;
      setMotorImportProgress(null);
      setError(analyzeError instanceof Error ? analyzeError.message : "Ошибка анализа");
      onOpenChange(true);
    } finally {
      analyzingRef.current = false;
      setLoading(false);
      setProgress(null);
    }
  }

  useEffect(() => {
    if (sheets.length === 0) return;

    if (resumeSession) {
      if (!open) return;
      setPreview({ ...resumeSession.preview, jobId: resumeSession.jobId });
      setEngineRows(resumeSession.preview.engineRows);
      setSheetMappings(resumeSession.preview.sheetMappings);
      setStep("review");
      setLoading(false);
      setProgress(null);
      setError(null);
      lastAnalyzedSheetsKeyRef.current = sheetsKey;
      return;
    }

    if (preview && lastAnalyzedSheetsKeyRef.current === sheetsKey) {
      if (open) {
        setStep("review");
        setLoading(false);
        setProgress(null);
      }
      return;
    }

    if (analyzeStartedForKeyRef.current === sheetsKey || analyzingRef.current) return;
    analyzeStartedForKeyRef.current = sheetsKey;

    void runAnalyze(undefined, { autoApply: true, closeDialog: true });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sheetsKey, resumeSession?.jobId, open]);

  useEffect(() => {
    if (motorImportProgress && open) {
      onOpenChange(false);
    }
  }, [motorImportProgress, open, onOpenChange]);

  useEffect(() => {
    if (open && step === "analyze" && preview && !loading) {
      setStep("review");
    }
  }, [open, step, preview, loading]);

  function updateSheetMapping(configId: string, patch: Partial<MotorSheetMappingResult["config"]>) {
    setSheetMappings((current) => {
      const existing = current[configId];
      if (!existing) return current;
      return {
        ...current,
        [configId]: {
          ...existing,
          config: { ...existing.config, ...patch },
          source: "manual",
        },
      };
    });
  }

  function toggleRow(rowKey: string, selected: boolean) {
    setEngineRows((current) => current.map((row) => (row.rowKey === rowKey ? { ...row, selected } : row)));
  }

  function canProceed() {
    if (loading) return false;
    if (step === "mapping") return Object.values(sheetMappings).length > 0;
    if (step === "review") return engineRows.length > 0 || hasSpecificSheets;
    if (step === "confirm") return selectedCount > 0 || hasSpecificSheets;
    return false;
  }

  async function goNext() {
    if (step === "mapping") {
      await runAnalyze(sheetMappings, { autoApply: false, closeDialog: false });
      setShowMapping(false);
      setStep("review");
      return;
    }

    if (step === "review") {
      setStep("confirm");
      return;
    }

    if (step === "confirm" && preview) {
      await runApplyInBackground(preview, engineRows, sheetMappings);
    }
  }

  function goBack() {
    if (step === "confirm") {
      setStep("review");
      return;
    }
    if (step === "mapping") {
      setShowMapping(false);
      setStep("review");
    }
  }

  function minimizeImport() {
    runningInBackgroundRef.current = true;
    onOpenChange(false);
    syncReviewPending(false, step);
  }

  function handleDialogOpenChange(nextOpen: boolean) {
    if (!nextOpen) {
      if (loading || motorImportProgress) {
        minimizeImport();
        return;
      }
      if (preview && (step === "review" || step === "confirm" || showMapping)) {
        syncReviewPending(false, step);
        onOpenChange(false);
        return;
      }
      resetState();
      onReviewPending?.(false);
    }
    onOpenChange(nextOpen);
  }

  useEffect(() => {
    syncReviewPending(open, step);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, step, preview, loading, motorImportProgress]);

  const activeStep = showMapping ? "mapping" : step;
  const dialogOpen = open && !motorImportProgress;

  return (
    <Dialog open={dialogOpen} onOpenChange={handleDialogOpenChange}>
      <DialogContent className="flex max-h-[90vh] max-w-5xl flex-col gap-0 overflow-hidden p-0">
        <DialogHeader className="border-b px-6 py-4">
          <div className="flex items-start justify-between gap-3">
            <div>
              <DialogTitle className="flex items-center gap-2">
                <Sparkles className="size-4 text-primary" />
                Magic Import · Моторы
              </DialogTitle>
              <DialogDescription>
                {stepLabels[activeStep]} · {stepHints[activeStep]}
                {!useAi ? " · только правила" : ""}
              </DialogDescription>
            </div>
            {onOpenHistory ? (
              <Button variant="ghost" size="sm" onClick={onOpenHistory}>
                История
              </Button>
            ) : null}
          </div>
        </DialogHeader>

        <div className="min-h-0 flex-1 overflow-auto px-6 py-4">
          {error ? <p className="mb-3 text-sm text-destructive">{error}</p> : null}
          {!motorImportProgress && progress ? (
            <ImportProgressBar percent={progress.percent} message={progress.message} className="mb-4" />
          ) : null}
          {!motorImportProgress && applyProgress != null ? (
            <ImportProgressBar percent={applyProgress} message="Загрузка в базу…" className="mb-4" />
          ) : null}

          <AnimatePresence mode="wait">
            {activeStep === "analyze" ? (
              <motion.div
                key="analyze"
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -6 }}
                transition={{ duration: 0.2 }}
                className="space-y-4"
              >
                {!preview ? (
                  <div className="rounded-xl border border-dashed border-primary/25 bg-primary/5 p-8 text-center">
                    <Sparkles className="mx-auto mb-3 size-8 text-primary/70" />
                    <p className="text-sm font-medium">Разбираем файл авторазбора</p>
                    <p className="mx-auto mt-2 max-w-lg text-xs text-muted-foreground">
                      ИИ определит листы двигателей, сопоставит серийники, бренды, комплектации, КПП и даты —
                      даже если таблица без нормальных заголовков
                    </p>
                  </div>
                ) : null}
                {sourceFileName ? <p className="text-sm text-muted-foreground">Файл: {sourceFileName}</p> : null}
                {preview ? (
                  <ImportStatsCards
                    preview={preview}
                    engineSheetCount={engineSheetCount}
                    selectedCount={selectedCount}
                  />
                ) : (
                  <p className="text-sm text-muted-foreground">{loading ? "Анализ файла…" : "Ожидание файла"}</p>
                )}
              </motion.div>
            ) : null}

            {activeStep === "review" ? (
              <motion.div
                key="review"
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -6 }}
                transition={{ duration: 0.2 }}
                className="space-y-4"
              >
                {preview ? (
                  <ImportStatsCards
                    preview={preview}
                    engineSheetCount={engineSheetCount}
                    selectedCount={selectedCount}
                  />
                ) : null}

                {preview?.aiNotes ? (
                  <p className="rounded-lg border bg-muted/20 px-3 py-2 text-xs text-muted-foreground">
                    {preview.aiNotes}
                  </p>
                ) : null}

                <div className="rounded-lg border bg-muted/20 p-3 text-sm">
                  <p>
                    К импорту: <span className="font-medium text-foreground">{selectedCount}</span> из{" "}
                    {engineRows.length} моторов
                  </p>
                  {uncertainRows.length > 0 ? (
                    <p className="mt-1 text-amber-700 dark:text-amber-300">
                      {uncertainRows.length} строк с низкой уверенностью ИИ — проверьте перед загрузкой
                    </p>
                  ) : null}
                  {duplicateRows.length > 0 ? (
                    <p className="mt-1 text-muted-foreground">
                      {duplicateRows.length} совпадений с базой — часть строк обновит существующие моторы
                    </p>
                  ) : null}
                  {hasSpecificSheets ? (
                    <p className="mt-1 text-muted-foreground">
                      Специфичные листы будут импортированы в свои категории
                    </p>
                  ) : null}
                </div>

                <div className="flex justify-end">
                  <Button variant="outline" size="sm" onClick={() => setShowMapping(true)}>
                    Настроить листы
                    <ChevronDown className="ml-1 size-3.5" />
                  </Button>
                </div>

                <MotorPreviewTable rows={engineRows.slice(0, 150)} onToggle={toggleRow} />
              </motion.div>
            ) : null}

            {activeStep === "mapping" ? (
              <motion.div
                key="mapping"
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -6 }}
                transition={{ duration: 0.2 }}
                className="space-y-4"
              >
                {Object.values(sheetMappings).map((mapping) => (
                  <SheetMappingCard
                    key={mapping.config.id}
                    mapping={mapping}
                    onUpdate={(patch) => updateSheetMapping(mapping.config.id, patch)}
                  />
                ))}
              </motion.div>
            ) : null}

            {activeStep === "confirm" ? (
              <motion.div
                key="confirm"
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -6 }}
                transition={{ duration: 0.2 }}
                className="space-y-4 text-sm"
              >
                <div className="rounded-lg border p-4">
                  <p className="font-medium">Загрузим {selectedCount} моторов</p>
                  <p className="mt-1 text-muted-foreground">
                    Новых: {engineRows.filter((row) => row.action === "create" && row.selected).length} · обновим:{" "}
                    {engineRows.filter((row) => row.action === "update" && row.selected).length}
                  </p>
                  {hasSpecificSheets ? (
                    <p className="mt-1 text-muted-foreground">
                      Специфичных категорий: {preview?.stats.specificSheets ?? 0}
                    </p>
                  ) : null}
                </div>
                {hasSpecificSheets ? (
                  <p className="rounded-lg border border-amber-500/30 bg-amber-500/10 p-3 text-amber-900 dark:text-amber-200">
                    Специфичные листы будут полностью заменены в своих категориях.
                  </p>
                ) : null}
                <p className="text-xs text-muted-foreground">
                  После нажатия «Загрузить» окно закроется — прогресс будет в шапке рядом с фильтрами.
                </p>
              </motion.div>
            ) : null}
          </AnimatePresence>
        </div>

        <DialogFooter className="border-t px-6 py-4">
          <Button variant="outline" onClick={() => (loading ? minimizeImport() : cancelImport())}>
            {loading ? "Свернуть" : "Отмена"}
          </Button>
          {activeStep !== "analyze" ? (
            <Button variant="outline" onClick={goBack} disabled={loading}>
              Назад
            </Button>
          ) : null}
          {loading && activeStep === "confirm" ? (
            <Button
              variant="outline"
              onClick={() => {
                cancelRef.current = true;
              }}
            >
              Остановить
            </Button>
          ) : null}
          {activeStep === "analyze" && preview && !loading ? (
            <Button onClick={() => setStep("review")}>К проверке</Button>
          ) : null}
          {activeStep !== "analyze" ? (
            <Button onClick={() => void goNext()} disabled={!canProceed()}>
              {activeStep === "confirm" ? "Загрузить в базу" : activeStep === "mapping" ? "Пересчитать" : "Далее"}
            </Button>
          ) : null}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function ImportStatsCards({
  preview,
  engineSheetCount,
  selectedCount,
}: {
  preview: MotorImportPreviewResult;
  engineSheetCount: number;
  selectedCount: number;
}) {
  return (
    <div className="grid gap-3 sm:grid-cols-4">
      <StatCard label="Листов" value={preview.sheets.length} hint={`${engineSheetCount} двигатели`} />
      <StatCard label="Моторов" value={preview.stats.totalEngineRows} hint={`${selectedCount} к загрузке`} />
      <StatCard label="Готово" value={preview.stats.validEngineRows} hint={`${preview.stats.errors} ошибок`} />
      <StatCard
        label="Специфичные"
        value={preview.stats.specificSheets}
        hint={preview.stats.duplicates ? `${preview.stats.duplicates} дубликатов` : "без дубликатов"}
      />
    </div>
  );
}

function StatCard({ label, value, hint }: { label: string; value: number; hint: string }) {
  return (
    <div className="rounded-lg border bg-card p-3">
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="mt-1 text-2xl font-semibold tabular-nums">{value}</p>
      <p className="mt-0.5 text-[11px] text-muted-foreground">{hint}</p>
    </div>
  );
}

function SheetMappingCard({
  mapping,
  onUpdate,
}: {
  mapping: MotorSheetMappingResult;
  onUpdate: (patch: Partial<MotorSheetMappingResult["config"]>) => void;
}) {
  return (
    <div className="rounded-lg border p-4">
      <div className="mb-3 flex items-center justify-between gap-3">
        <div>
          <p className="font-medium">{mapping.config.sheetName}</p>
          <p className="text-xs text-muted-foreground">
            {mapping.source === "ai" ? "ИИ" : mapping.source === "manual" ? "Вручную" : "Правила"} ·{" "}
            {mapping.reasoning}
          </p>
        </div>
        <ConfidenceBadge confidence={mapping.confidence} />
      </div>
      <div className="grid gap-3 md:grid-cols-2">
        <div className="space-y-1">
          <Label>Тип листа</Label>
          <Select
            value={mapping.config.importType}
            onValueChange={(value) => onUpdate({ importType: value as SheetImportType })}
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {importTypeOptions.map((option) => (
                <SelectItem key={option.value} value={option.value}>
                  {option.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        {mapping.config.importType === "engines" ? (
          <>
            <div className="space-y-1">
              <Label>Бренд листа</Label>
              <Input
                value={mapping.config.customBrand}
                onChange={(event) => onUpdate({ customBrand: event.target.value })}
                placeholder="Toyota"
              />
            </div>
            <div className="space-y-1">
              <Label>Код двигателя</Label>
              <Input
                value={mapping.config.customEngineCode}
                onChange={(event) => onUpdate({ customEngineCode: event.target.value })}
                placeholder="1JZ-GTE"
              />
            </div>
          </>
        ) : null}
        {mapping.config.importType === "specific" ? (
          <div className="space-y-1">
            <Label>Категория</Label>
            <Input
              value={mapping.config.categoryName}
              onChange={(event) => onUpdate({ categoryName: event.target.value })}
              placeholder="Например: Коробки"
            />
          </div>
        ) : null}
      </div>
    </div>
  );
}

function MotorPreviewTable({
  rows,
  onToggle,
}: {
  rows: MotorImportPreviewRow[];
  onToggle: (rowKey: string, selected: boolean) => void;
}) {
  return (
    <div className="overflow-auto rounded-lg border">
      <table className="min-w-full text-sm">
        <thead className="sticky top-0 bg-muted/80">
          <tr>
            <th className="px-3 py-2 text-left">✓</th>
            <th className="px-3 py-2 text-left">Серийник</th>
            <th className="px-3 py-2 text-left">Бренд</th>
            <th className="px-3 py-2 text-left">Двигатель</th>
            <th className="px-3 py-2 text-left">Комплектация</th>
            <th className="px-3 py-2 text-left">КПП</th>
            <th className="px-3 py-2 text-left">Приход</th>
            <th className="px-3 py-2 text-left">Статус</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => {
            const uncertain = row.aiMeta?.warnings.some((warning) => warning.includes("не уверен"));
            const status =
              row.errors.length > 0 ? row.errors[0] : row.summary ?? actionLabel(row.action);

            return (
              <tr
                key={row.rowKey}
                className={cn(
                  "border-t transition-colors",
                  row.errors.length ? "bg-destructive/5" : "",
                  uncertain ? "bg-amber-500/5" : "",
                )}
              >
                <td className="px-3 py-2">
                  <input
                    type="checkbox"
                    checked={row.selected}
                    disabled={row.errors.length > 0}
                    onChange={(event) => onToggle(row.rowKey, event.target.checked)}
                  />
                </td>
                <td className="px-3 py-2 font-medium">{row.serialCode}</td>
                <td className="px-3 py-2">{row.brandName}</td>
                <td className="px-3 py-2">{row.engineCode}</td>
                <td className="max-w-[140px] truncate px-3 py-2 text-muted-foreground">
                  {row.configuration || "—"}
                </td>
                <td className="px-3 py-2 text-muted-foreground">{row.transmission || "—"}</td>
                <td className="px-3 py-2 tabular-nums text-muted-foreground">
                  {formatMotorDate(row.arrivalDate) || "—"}
                </td>
                <td className="px-3 py-2">
                  <div className="flex items-center gap-2">
                    <span className="text-xs">{status}</span>
                    <ConfidenceBadge confidence={row.confidence} />
                  </div>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
