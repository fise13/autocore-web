"use client";

import { useEffect, useMemo, useRef, useState } from "react";

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
import { SheetImportType } from "@/lib/motors/excel-sheet-config";
import { ExcelSheetData, MotorExcelImportResult } from "@/lib/motors/excel-types";
import {
  MotorImportPreviewResult,
  MotorImportPreviewRow,
  MotorImportProgress,
  MotorSheetMappingResult,
} from "@/lib/motors/import/types";
import { cn } from "@/lib/utils";

type WizardStep = "analyze" | "mapping" | "preview" | "duplicates" | "confirm";

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

const stepOrder: WizardStep[] = ["analyze", "mapping", "preview", "duplicates", "confirm"];
const stepLabels: Record<WizardStep, string> = {
  analyze: "Анализ",
  mapping: "Листы",
  preview: "Preview",
  duplicates: "Дубликаты",
  confirm: "Подтверждение",
};

const importTypeOptions: { value: SheetImportType; label: string }[] = [
  { value: "engines", label: "Двигатели" },
  { value: "specific", label: "Специфичный" },
  { value: "skip", label: "Пропустить" },
];

export function MotorImportWizard({
  sheets,
  sourceFileName,
  open,
  onOpenChange,
  useAi,
  resumeSession,
  onOpenHistory,
  onAnalyze,
  onApply,
  onComplete,
}: MotorImportWizardProps) {
  const cancelRef = useRef(false);
  const [step, setStep] = useState<WizardStep>("analyze");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [progress, setProgress] = useState<MotorImportProgress | null>(null);
  const [applyProgress, setApplyProgress] = useState<number | null>(null);
  const [preview, setPreview] = useState<(MotorImportPreviewResult & { jobId: string }) | null>(null);
  const [engineRows, setEngineRows] = useState<MotorImportPreviewRow[]>([]);
  const [sheetMappings, setSheetMappings] = useState<Record<string, MotorSheetMappingResult>>({});

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

  function resetState() {
    setStep("analyze");
    setLoading(false);
    setError(null);
    setProgress(null);
    setApplyProgress(null);
    setPreview(null);
    setEngineRows([]);
    setSheetMappings({});
    cancelRef.current = false;
  }

  async function runAnalyze(manualSheetMappings?: Record<string, MotorSheetMappingResult>) {
    setLoading(true);
    setError(null);
    try {
      const result = await onAnalyze({
        sheets,
        sourceFileName,
        manualSheetMappings,
        onProgress: setProgress,
      });
      setPreview(result);
      setEngineRows(result.engineRows);
      setSheetMappings(result.sheetMappings);
      setStep("mapping");
    } catch (analyzeError) {
      setError(analyzeError instanceof Error ? analyzeError.message : "Ошибка анализа");
    } finally {
      setLoading(false);
      setProgress(null);
    }
  }

  useEffect(() => {
    if (!open) return;
    if (resumeSession) {
      setPreview({ ...resumeSession.preview, jobId: resumeSession.jobId });
      setEngineRows(resumeSession.preview.engineRows);
      setSheetMappings(resumeSession.preview.sheetMappings);
      setStep("preview");
      return;
    }
    if (sheets.length > 0) void runAnalyze();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, resumeSession?.jobId]);

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
    if (step === "analyze") return Boolean(preview);
    if (step === "mapping") return Object.values(sheetMappings).length > 0;
    if (step === "preview") return engineRows.length > 0;
    if (step === "confirm") return selectedCount > 0 || hasSpecificSheets;
    return true;
  }

  async function goNext() {
    const index = stepOrder.indexOf(step);
    if (index < stepOrder.length - 1) {
      if (step === "mapping") {
        await runAnalyze(sheetMappings);
      }
      setStep(stepOrder[index + 1]);
      return;
    }

    if (!preview) return;
    setLoading(true);
    setError(null);
    cancelRef.current = false;
    try {
      const result = await onApply({
        jobId: preview.jobId,
        preview: { ...preview, engineRows, sheetMappings },
        onProgress: (value) => setApplyProgress(value.percent),
        shouldCancel: () => cancelRef.current,
      });
      if (!result.cancelled) onComplete(result);
      onOpenChange(false);
      resetState();
    } catch (applyError) {
      setError(applyError instanceof Error ? applyError.message : "Ошибка импорта");
    } finally {
      setLoading(false);
      setApplyProgress(null);
    }
  }

  function goBack() {
    const index = stepOrder.indexOf(step);
    if (index > 0) setStep(stepOrder[index - 1]);
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(nextOpen) => {
        if (!nextOpen) resetState();
        onOpenChange(nextOpen);
      }}
    >
      <DialogContent className="flex max-h-[90vh] max-w-5xl flex-col gap-0 overflow-hidden p-0">
        <DialogHeader className="border-b px-6 py-4">
          <div className="flex items-start justify-between gap-3">
            <div>
              <DialogTitle>Импорт моторов</DialogTitle>
              <DialogDescription>
                {stepLabels[step]} · {useAi ? "AI fallback включён" : "Только правила"}
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
          {progress ? <ImportProgressBar percent={progress.percent} message={progress.message} className="mb-4" /> : null}
          {applyProgress != null ? (
            <ImportProgressBar percent={applyProgress} message="Применение импорта…" className="mb-4" />
          ) : null}

          {step === "analyze" ? (
            <div className="space-y-3 text-sm">
              <p>Листов: {sheets.length}</p>
              {preview ? (
                <p>
                  Строк двигателей: {preview.stats.totalEngineRows} · валидных: {preview.stats.validEngineRows} ·
                  дубликатов: {preview.stats.duplicates}
                </p>
              ) : (
                <p className="text-muted-foreground">{loading ? "Анализ файла…" : "Ожидание файла"}</p>
              )}
            </div>
          ) : null}

          {step === "mapping" ? (
            <div className="space-y-4">
              {Object.values(sheetMappings).map((mapping) => (
                <div key={mapping.config.id} className="rounded-lg border p-4">
                  <div className="mb-3 flex items-center justify-between gap-3">
                    <div>
                      <p className="font-medium">{mapping.config.sheetName}</p>
                      <p className="text-xs text-muted-foreground">
                        {mapping.source} · {mapping.reasoning}
                      </p>
                    </div>
                    <ConfidenceBadge confidence={mapping.confidence} />
                  </div>
                  <div className="grid gap-3 md:grid-cols-2">
                    <div className="space-y-1">
                      <Label>Тип листа</Label>
                      <Select
                        value={mapping.config.importType}
                        onValueChange={(value) =>
                          updateSheetMapping(mapping.config.id, { importType: value as SheetImportType })
                        }
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
                          <Label>Бренд</Label>
                          <Input
                            value={mapping.config.customBrand}
                            onChange={(event) =>
                              updateSheetMapping(mapping.config.id, { customBrand: event.target.value })
                            }
                          />
                        </div>
                        <div className="space-y-1">
                          <Label>Код двигателя</Label>
                          <Input
                            value={mapping.config.customEngineCode}
                            onChange={(event) =>
                              updateSheetMapping(mapping.config.id, { customEngineCode: event.target.value })
                            }
                          />
                        </div>
                      </>
                    ) : null}
                    {mapping.config.importType === "specific" ? (
                      <div className="space-y-1">
                        <Label>Категория</Label>
                        <Input
                          value={mapping.config.categoryName}
                          onChange={(event) =>
                            updateSheetMapping(mapping.config.id, { categoryName: event.target.value })
                          }
                        />
                      </div>
                    ) : null}
                  </div>
                </div>
              ))}
            </div>
          ) : null}

          {step === "preview" || step === "duplicates" ? (
            <MotorPreviewTable
              rows={(step === "duplicates" ? duplicateRows : engineRows).slice(0, 100)}
              onToggle={toggleRow}
              duplicateMode={step === "duplicates"}
            />
          ) : null}

          {step === "confirm" ? (
            <div className="space-y-4 text-sm">
              <div className="rounded-lg border p-4">
                <p>Импортировать моторов: {selectedCount}</p>
                <p className="text-muted-foreground">
                  Создание: {engineRows.filter((row) => row.action === "create" && row.selected).length}
                </p>
                <p className="text-muted-foreground">
                  Обновление: {engineRows.filter((row) => row.action === "update" && row.selected).length}
                </p>
              </div>
              {hasSpecificSheets ? (
                <p className="rounded-lg border border-amber-500/30 bg-amber-500/10 p-3 text-amber-900">
                  Специфичные листы будут полностью заменены в своих категориях.
                </p>
              ) : null}
            </div>
          ) : null}
        </div>

        <DialogFooter className="border-t px-6 py-4">
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={loading}>
            Отмена
          </Button>
          {step !== "analyze" ? (
            <Button variant="outline" onClick={goBack} disabled={loading}>
              Назад
            </Button>
          ) : null}
          {loading && step === "confirm" ? (
            <Button variant="outline" onClick={() => { cancelRef.current = true; }}>
              Остановить
            </Button>
          ) : null}
          <Button onClick={() => void goNext()} disabled={!canProceed()}>
            {step === "confirm" ? "Импортировать" : "Далее"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function MotorPreviewTable({
  rows,
  onToggle,
  duplicateMode,
}: {
  rows: MotorImportPreviewRow[];
  onToggle: (rowKey: string, selected: boolean) => void;
  duplicateMode?: boolean;
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
            <th className="px-3 py-2 text-left">Действие</th>
            <th className="px-3 py-2 text-left">Confidence</th>
            {duplicateMode ? <th className="px-3 py-2 text-left">Причина</th> : null}
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr key={row.rowKey} className={cn("border-t", row.errors.length ? "bg-destructive/5" : "")}>
              <td className="px-3 py-2">
                <input
                  type="checkbox"
                  checked={row.selected}
                  disabled={row.errors.length > 0}
                  onChange={(event) => onToggle(row.rowKey, event.target.checked)}
                />
              </td>
              <td className="px-3 py-2">{row.serialCode}</td>
              <td className="px-3 py-2">{row.brandName}</td>
              <td className="px-3 py-2">{row.engineCode}</td>
              <td className="px-3 py-2">{row.action}</td>
              <td className="px-3 py-2">
                <ConfidenceBadge confidence={row.confidence} />
              </td>
              {duplicateMode ? (
                <td className="px-3 py-2 text-xs text-muted-foreground">
                  {row.duplicateReasons?.join(", ") ?? row.summary}
                </td>
              ) : null}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
