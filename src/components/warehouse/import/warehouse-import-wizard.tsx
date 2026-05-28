"use client";

import { ChangeEvent, useEffect, useMemo, useRef, useState } from "react";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { InventoryImportRow } from "@/domain/inventory-import";
import { ImportApplyOptions, ImportPreviewResult, ImportProgress } from "@/lib/warehouse/import/types";
import { IMPORT_TARGET_FIELDS } from "@/lib/warehouse/import/types";
import { ConfidenceBadge } from "@/components/warehouse/import/shared/confidence-badge";
import { ImportProgressBar } from "@/components/warehouse/import/shared/import-progress-bar";
import { cn } from "@/lib/utils";

type WizardStep = "upload" | "mapping" | "preview" | "duplicates" | "confirm";

type ResumeSession = {
  jobId: string;
  rows: InventoryImportRow[];
  columnMapping: Record<string, string>;
  sourceFileName?: string;
  stats: {
    total: number;
    valid: number;
    duplicates: number;
    errors: number;
    warnings?: number;
  };
};

type WarehouseImportWizardProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  useAi: boolean;
  resumeSession?: ResumeSession | null;
  onOpenHistory?: () => void;
  onAnalyze: (input: {
    file: File;
    selectedSheetName?: string;
    manualColumnMapping?: Record<string, string>;
    onProgress?: (progress: ImportProgress) => void;
  }) => Promise<ImportPreviewResult & { jobId: string }>;
  onApply: (input: {
    jobId: string;
    rows: InventoryImportRow[];
    sourceFileName?: string;
    applyOptions: ImportApplyOptions;
    onProgress?: (progress: { applied: number; failed: number; total: number; percent: number }) => void;
    shouldCancel?: () => boolean;
  }) => Promise<{ applied: number; failed: number; cancelled?: boolean }>;
};

const stepOrder: WizardStep[] = ["upload", "mapping", "preview", "duplicates", "confirm"];

const stepLabels: Record<WizardStep, string> = {
  upload: "Файл",
  mapping: "Колонки",
  preview: "Нормализация",
  duplicates: "Дубликаты",
  confirm: "Подтверждение",
};

const fieldLabels: Record<string, string> = {
  sku: "SKU / Артикул",
  name: "Название",
  barcode: "Штрихкод",
  quantity: "Количество",
  supplierName: "Поставщик",
  purchasePrice: "Закупка",
  sellPrice: "Продажа",
  category: "Категория",
  brandName: "Бренд",
  warehouseLocation: "Место",
  unit: "Ед.",
  lowStockThreshold: "Мин. запас",
};

export function WarehouseImportWizard({
  open,
  onOpenChange,
  useAi,
  resumeSession,
  onOpenHistory,
  onAnalyze,
  onApply,
}: WarehouseImportWizardProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const cancelRef = useRef(false);
  const [step, setStep] = useState<WizardStep>("upload");
  const [file, setFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [progress, setProgress] = useState<ImportProgress | null>(null);
  const [preview, setPreview] = useState<(ImportPreviewResult & { jobId: string }) | null>(null);
  const [rows, setRows] = useState<InventoryImportRow[]>([]);
  const [manualMapping, setManualMapping] = useState<Record<string, string>>({});
  const [selectedSheetName, setSelectedSheetName] = useState<string | undefined>();
  const [createExpense, setCreateExpense] = useState(false);
  const [applyProgress, setApplyProgress] = useState<number | null>(null);

  const duplicateRows = useMemo(
    () => rows.filter((row) => Boolean(row.duplicateOfItemId)),
    [rows],
  );
  const selectedCount = useMemo(
    () => rows.filter((row) => row.selected && row.errors.length === 0).length,
    [rows],
  );

  useEffect(() => {
    if (!open || !resumeSession) return;
    setPreview({
      jobId: resumeSession.jobId,
      rows: resumeSession.rows as ImportPreviewResult["rows"],
      stats: resumeSession.stats,
      selectedSheetName: resumeSession.sourceFileName ?? "import",
      sheets: [],
      columnMapping: {
        mapping: resumeSession.columnMapping,
        fieldConfidence: {},
        source: "manual",
        warnings: [],
      },
    });
    setRows(resumeSession.rows);
    setManualMapping(resumeSession.columnMapping);
    setStep("preview");
    setError(null);
  }, [open, resumeSession]);

  function resetState() {
    setStep("upload");
    setFile(null);
    setLoading(false);
    setError(null);
    setProgress(null);
    setPreview(null);
    setRows([]);
    setManualMapping({});
    setSelectedSheetName(undefined);
    setCreateExpense(false);
    setApplyProgress(null);
    cancelRef.current = false;
  }

  async function analyzeCurrentFile(nextSheet?: string, nextMapping?: Record<string, string>) {
    if (!file) return;
    setLoading(true);
    setError(null);
    try {
      const result = await onAnalyze({
        file,
        selectedSheetName: nextSheet ?? selectedSheetName,
        manualColumnMapping: nextMapping ?? (Object.keys(manualMapping).length ? manualMapping : undefined),
        onProgress: setProgress,
      });
      setPreview(result);
      setRows(result.rows);
      setManualMapping(result.columnMapping.mapping);
      setSelectedSheetName(result.selectedSheetName);
    } catch (analyzeError) {
      setError(analyzeError instanceof Error ? analyzeError.message : "Ошибка анализа файла");
    } finally {
      setLoading(false);
      setProgress(null);
    }
  }

  async function handleFileChange(event: ChangeEvent<HTMLInputElement>) {
    const nextFile = event.target.files?.[0];
    if (!nextFile) return;
    setFile(nextFile);
    setStep("upload");
    await analyzeCurrentFile(undefined, undefined);
    if (!error) setStep("mapping");
  }

  function toggleRow(rowIndex: number, selected: boolean) {
    setRows((current) =>
      current.map((row) => (row.rowIndex === rowIndex ? { ...row, selected } : row)),
    );
  }

  function canProceed(): boolean {
    if (loading) return false;
    if (step === "upload") return Boolean(file && preview);
    if (step === "mapping") return Boolean(preview?.columnMapping.mapping.sku);
    if (step === "preview") return rows.length > 0;
    if (step === "duplicates") return true;
    if (step === "confirm") return selectedCount > 0;
    return false;
  }

  async function goNext() {
    const index = stepOrder.indexOf(step);
    if (index < stepOrder.length - 1) {
      if (step === "mapping") {
        await analyzeCurrentFile(selectedSheetName, manualMapping);
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
        rows,
        sourceFileName: preview.selectedSheetName,
        applyOptions: {
          createExpense,
          updateExistingMetadata: true,
        },
        onProgress: (value) => setApplyProgress(value.percent),
        shouldCancel: () => cancelRef.current,
      });
      onOpenChange(false);
      resetState();
      alert(
        result.cancelled
          ? "Импорт отменён"
          : `Импортировано: ${result.applied}${result.failed ? ` · ошибок: ${result.failed}` : ""}`,
      );
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
              <DialogTitle>Импорт склада</DialogTitle>
              <DialogDescription>
                {stepLabels[step]} · {useAi ? "AI-подсказки включены" : "Только правила"}
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
          {applyProgress != null ? <ImportProgressBar percent={applyProgress} message="Применение импорта…" className="mb-4" /> : null}

          {step === "upload" ? (
            <div className="space-y-4">
              <div
                className="flex cursor-pointer flex-col items-center justify-center rounded-xl border border-dashed p-10 text-center"
                onClick={() => fileInputRef.current?.click()}
              >
                <p className="text-sm font-medium">Перетащите или выберите XLSX / XLS / CSV</p>
                <p className="mt-1 text-xs text-muted-foreground">
                  Поддерживаются хаотичные supplier-файлы с RU/EN заголовками
                </p>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".xlsx,.xls,.csv,.tsv,.txt"
                  className="hidden"
                  onChange={handleFileChange}
                />
              </div>
              {file ? <p className="text-sm text-muted-foreground">Файл: {file.name}</p> : null}
              {preview ? (
                <p className="text-sm">
                  Найдено строк: {preview.stats.total} · валидных: {preview.stats.valid} · дубликатов:{" "}
                  {preview.stats.duplicates} · ошибок: {preview.stats.errors}
                </p>
              ) : null}
            </div>
          ) : null}

          {step === "mapping" && preview ? (
            <div className="space-y-4">
              {preview.sheets.length > 1 ? (
                <div className="space-y-2">
                  <Label>Лист Excel</Label>
                  <Select
                    value={selectedSheetName}
                    onValueChange={(value) => {
                      if (!value) return;
                      setSelectedSheetName(value);
                      void analyzeCurrentFile(value, manualMapping);
                    }}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Выберите лист" />
                    </SelectTrigger>
                    <SelectContent>
                      {preview.sheets.map((sheet) => (
                        <SelectItem key={sheet.sheetName} value={sheet.sheetName}>
                          {sheet.sheetName} ({sheet.rows.length})
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              ) : null}

              <div className="grid gap-3 md:grid-cols-2">
                {IMPORT_TARGET_FIELDS.map((field) => (
                  <div key={field} className="space-y-1">
                    <Label>{fieldLabels[field] ?? field}</Label>
                    <Select
                      value={manualMapping[field] ?? ""}
                      onValueChange={(value) => {
                        if (!value) return;
                        setManualMapping((current) => ({ ...current, [field]: value }));
                      }}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Не выбрано" />
                      </SelectTrigger>
                      <SelectContent>
                        {preview.sheets
                          .find((sheet) => sheet.sheetName === selectedSheetName)
                          ?.headers.map((header) => (
                            <SelectItem key={header} value={header}>
                              {header}
                            </SelectItem>
                          ))}
                      </SelectContent>
                    </Select>
                  </div>
                ))}
              </div>

              <div className="rounded-lg border bg-muted/20 p-3 text-sm">
                <p className="font-medium">Источник сопоставления: {preview.columnMapping.source}</p>
                {preview.columnMapping.reasoning ? (
                  <p className="mt-1 text-muted-foreground">{preview.columnMapping.reasoning}</p>
                ) : null}
              </div>
            </div>
          ) : null}

          {step === "preview" ? (
            <PreviewTable rows={rows.slice(0, 100)} onToggle={toggleRow} />
          ) : null}

          {step === "duplicates" ? (
            duplicateRows.length > 0 ? (
              <PreviewTable rows={duplicateRows.slice(0, 100)} onToggle={toggleRow} duplicateMode />
            ) : (
              <p className="text-sm text-muted-foreground">Дубликаты не найдены — можно продолжать.</p>
            )
          ) : null}

          {step === "confirm" ? (
            <div className="space-y-4">
              <div className="rounded-lg border p-4 text-sm">
                <p>Будет импортировано строк: {selectedCount}</p>
                <p className="text-muted-foreground">Создание: {rows.filter((row) => row.action === "create" && row.selected).length}</p>
                <p className="text-muted-foreground">Обновление: {rows.filter((row) => row.action === "update" && row.selected).length}</p>
              </div>
              <label className="flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={createExpense}
                  onChange={(event) => setCreateExpense(event.target.checked)}
                />
                Создавать расходные операции по закупочной цене
              </label>
            </div>
          ) : null}
        </div>

        <DialogFooter className="border-t px-6 py-4">
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={loading}>
            Отмена
          </Button>
          {step !== "upload" ? (
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

function PreviewTable({
  rows,
  onToggle,
  duplicateMode = false,
}: {
  rows: InventoryImportRow[];
  onToggle: (rowIndex: number, selected: boolean) => void;
  duplicateMode?: boolean;
}) {
  return (
    <div className="overflow-auto rounded-lg border">
      <table className="min-w-full text-sm">
        <thead className="sticky top-0 bg-muted/80">
          <tr>
            <th className="px-3 py-2 text-left">✓</th>
            <th className="px-3 py-2 text-left">#</th>
            <th className="px-3 py-2 text-left">SKU</th>
            <th className="px-3 py-2 text-left">Название</th>
            <th className="px-3 py-2 text-left">Qty</th>
            <th className="px-3 py-2 text-left">Действие</th>
            <th className="px-3 py-2 text-left">Confidence</th>
            {duplicateMode ? <th className="px-3 py-2 text-left">Причина</th> : null}
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr key={row.rowIndex} className={cn("border-t", row.errors.length ? "bg-destructive/5" : "")}>
              <td className="px-3 py-2">
                <input
                  type="checkbox"
                  checked={row.selected}
                  disabled={row.errors.length > 0}
                  onChange={(event) => onToggle(row.rowIndex, event.target.checked)}
                />
              </td>
              <td className="px-3 py-2">{row.rowIndex}</td>
              <td className="px-3 py-2">{String(row.normalized.sku ?? "")}</td>
              <td className="px-3 py-2">{String(row.normalized.name ?? "")}</td>
              <td className="px-3 py-2">{String(row.normalized.quantity ?? "")}</td>
              <td className="px-3 py-2">{row.action ?? "create"}</td>
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
