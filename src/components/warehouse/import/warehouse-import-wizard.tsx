"use client";

import { ChangeEvent, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import { Sparkles, Upload } from "lucide-react";

import { useWorkspace } from "@/components/layout/workspace-context";
import { Button } from "@/components/ui/button";
import { useToast } from "@/components/ui/toast-provider";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { InventoryImportRow } from "@/domain/inventory-import";
import { ImportProgressBar } from "@/components/warehouse/import/shared/import-progress-bar";
import {
  ImportApplyOptions,
  ImportPreviewResult,
  ImportProgress,
} from "@/lib/warehouse/import/types";
import { cn } from "@/lib/utils";
import { userCopy } from "@/lib/user-copy";

type WizardStep = "upload" | "review" | "confirm";

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

const stepOrder: WizardStep[] = ["upload", "review", "confirm"];

function stepLabels(): Record<WizardStep, string> {
  return { ...userCopy.warehouse.import.steps };
}

function stepHints(): Record<WizardStep, string> {
  return { ...userCopy.warehouse.import.stepHints };
}

export function WarehouseImportWizard({
  open,
  onOpenChange,
  useAi,
  resumeSession,
  onOpenHistory,
  onAnalyze,
  onApply,
}: WarehouseImportWizardProps) {
  const { warehouseImportProgress, setWarehouseImportProgress, registerWarehouseImportCancel } =
    useWorkspace();
  const { toast } = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const cancelRef = useRef(false);
  const runningInBackgroundRef = useRef(false);
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

  const uncertainRows = useMemo(
    () => rows.filter((row) => row.aiMeta?.warnings.some((warning) => warning.includes(userCopy.warehouse.import.uncertainToken))),
    [rows],
  );
  const selectedCount = useMemo(
    () => rows.filter((row) => row.selected && row.errors.length === 0).length,
    [rows],
  );

  function pushGlobalProgress(
    phase: "analyze" | "apply",
    next: { percent: number; message: string },
    fileName?: string,
  ) {
    setWarehouseImportProgress({
      phase,
      percent: next.percent,
      message: next.message,
      fileName: fileName ?? file?.name,
    });
  }

  function clearGlobalProgress() {
    if (!runningInBackgroundRef.current) {
      setWarehouseImportProgress(null);
    }
  }

  const cancelImport = useCallback(() => {
    cancelRef.current = true;
    runningInBackgroundRef.current = false;
    registerWarehouseImportCancel(null);
    setWarehouseImportProgress(null);
    setLoading(false);
    setProgress(null);
    setApplyProgress(null);
    setError(null);
    setPreview(null);
    setRows([]);
    setManualMapping({});
    setSelectedSheetName(undefined);
    setCreateExpense(false);
    setFile(null);
    setStep("upload");
    onOpenChange(false);
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  }, [onOpenChange, registerWarehouseImportCancel, setWarehouseImportProgress]);

  useEffect(() => {
    if (!warehouseImportProgress) return;
    registerWarehouseImportCancel(cancelImport);
    return () => registerWarehouseImportCancel(null);
  }, [cancelImport, registerWarehouseImportCancel, warehouseImportProgress]);

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
    setStep("review");
    setError(null);
  }, [open, resumeSession]);

  function resetState() {
    runningInBackgroundRef.current = false;
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
    registerWarehouseImportCancel(null);
    setWarehouseImportProgress(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  }

  async function handleFileChange(event: ChangeEvent<HTMLInputElement>) {
    const nextFile = event.target.files?.[0];
    if (!nextFile) return;
    setFile(nextFile);
    setStep("upload");
    setLoading(true);
    setError(null);
    cancelRef.current = false;
    runningInBackgroundRef.current = true;
    pushGlobalProgress("analyze", { percent: 2, message: userCopy.warehouse.import.readingFile }, nextFile.name);
    onOpenChange(false);

    try {
      const result = await onAnalyze({
        file: nextFile,
        onProgress: (value) => {
          setProgress(value);
          pushGlobalProgress("analyze", { percent: value.percent, message: value.message ?? "" }, nextFile.name);
        },
      });

      if (cancelRef.current) {
        setLoading(false);
        setProgress(null);
        return;
      }

      setPreview(result);
      setRows(result.rows);
      setManualMapping(result.columnMapping.mapping);
      setSelectedSheetName(result.selectedSheetName);
      setStep(result.columnMapping.quickImport ? "confirm" : "review");
      runningInBackgroundRef.current = false;
      setWarehouseImportProgress(null);
      onOpenChange(true);
    } catch (analyzeError) {
      if (cancelRef.current) return;
      runningInBackgroundRef.current = false;
      setWarehouseImportProgress(null);
      setError(analyzeError instanceof Error ? analyzeError.message : userCopy.warehouse.import.analyzeFailed);
      onOpenChange(true);
    } finally {
      setLoading(false);
      setProgress(null);
    }
  }

  function toggleRow(rowIndex: number, selected: boolean) {
    setRows((current) =>
      current.map((row) => (row.rowIndex === rowIndex ? { ...row, selected } : row)),
    );
  }

  function canProceed(): boolean {
    if (loading) return false;
    if (step === "upload") return Boolean(file && preview);
    if (step === "review") return rows.length > 0;
    if (step === "confirm") return selectedCount > 0;
    return false;
  }

  async function goNext() {
    const index = stepOrder.indexOf(step);
    if (index < stepOrder.length - 1) {
      setStep(stepOrder[index + 1]);
      return;
    }

    if (!preview) return;
    setLoading(true);
    setError(null);
    cancelRef.current = false;
    runningInBackgroundRef.current = true;
    pushGlobalProgress("apply", { percent: 0, message: userCopy.warehouse.import.uploadingItems });
    onOpenChange(false);

    try {
      const result = await onApply({
        jobId: preview.jobId,
        rows,
        sourceFileName: preview.selectedSheetName,
        applyOptions: {
          createExpense,
          updateExistingMetadata: true,
        },
        onProgress: (value) => {
          setApplyProgress(value.percent);
          pushGlobalProgress("apply", {
            percent: value.percent,
            message: userCopy.warehouse.import.uploadingProgress(value.applied, value.total),
          });
        },
        shouldCancel: () => cancelRef.current,
      });
      resetState();
      if (!result.cancelled) {
        toast({
          title: userCopy.motors.magicImportDone,
          description: userCopy.warehouse.import.uploadedDescription(result.applied, result.failed),
          variant: result.failed ? "default" : "success",
        });
      }
    } catch (applyError) {
      if (cancelRef.current) return;
      runningInBackgroundRef.current = false;
      setWarehouseImportProgress(null);
      setError(applyError instanceof Error ? applyError.message : userCopy.warehouse.import.applyFailed);
      onOpenChange(true);
    } finally {
      setLoading(false);
      setApplyProgress(null);
    }
  }

  function goBack() {
    const index = stepOrder.indexOf(step);
    if (index <= 0) return;
    if (step === "confirm" && preview?.columnMapping.quickImport) {
      setStep("upload");
      return;
    }
    setStep(stepOrder[index - 1]);
  }

  function minimizeImport() {
    runningInBackgroundRef.current = true;
    onOpenChange(false);
  }

  useEffect(() => {
    if (open && warehouseImportProgress && loading) {
      runningInBackgroundRef.current = true;
      onOpenChange(false);
    }
  }, [open, warehouseImportProgress, loading, onOpenChange]);

  function handleDialogOpenChange(nextOpen: boolean) {
    if (!nextOpen) {
      if (loading) {
        minimizeImport();
        return;
      }
      resetState();
    }
    onOpenChange(nextOpen);
  }

  return (
    <Dialog open={open} onOpenChange={handleDialogOpenChange}>
      <DialogContent className="flex max-h-[90vh] max-w-5xl flex-col gap-0 overflow-hidden p-0">
        <DialogHeader className="border-b px-6 py-4">
          <div className="flex items-start justify-between gap-3">
            <div>
              <DialogTitle className="flex items-center gap-2">
                <Sparkles className="size-4 text-primary" />
                Magic Import
              </DialogTitle>
              <DialogDescription>
                {stepLabels()[step]} · {stepHints()[step]}
                {useAi ? "" : ""}
              </DialogDescription>
            </div>
            {onOpenHistory ? (
              <Button variant="ghost" size="sm" onClick={onOpenHistory}>
                {userCopy.warehouse.import.history}
              </Button>
            ) : null}
          </div>
        </DialogHeader>

        <div className="min-h-0 flex-1 overflow-auto px-6 py-4">
          {error ? <p className="mb-3 text-sm text-destructive">{error}</p> : null}
          {progress ? <ImportProgressBar percent={progress.percent} message={progress.message} className="mb-4" /> : null}
          {applyProgress != null ? (
            <ImportProgressBar percent={applyProgress} message={userCopy.warehouse.import.uploadingBanner} className="mb-4" />
          ) : null}

          <AnimatePresence mode="wait">
            {step === "upload" ? (
              <motion.div
                key="upload"
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -6 }}
                transition={{ duration: 0.2 }}
                className="space-y-4"
              >
                <div
                  className="group flex cursor-pointer flex-col items-center justify-center rounded-xl border border-dashed border-primary/25 bg-primary/5 p-10 text-center transition hover:border-primary/40 hover:bg-primary/8"
                  onClick={() => fileInputRef.current?.click()}
                >
                  <Upload className="mb-3 size-8 text-primary/70 transition group-hover:scale-105" />
                  <p className="text-sm font-medium">{userCopy.warehouse.import.pickFileTitle}</p>
                  <p className="mt-2 max-w-md text-xs text-muted-foreground">
                    {userCopy.warehouse.import.pickFileHint}
                  </p>
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept=".xlsx,.xls,.csv,.tsv,.txt"
                    className="hidden"
                    onChange={handleFileChange}
                  />
                </div>
                {file ? (
                  <p className="text-sm text-muted-foreground">
                    {userCopy.warehouse.import.fileLabel(file.name)}
                  </p>
                ) : null}
                {preview ? (
                  <p className="text-sm">
                    {userCopy.warehouse.import.statsLine(
                      preview.stats.total,
                      preview.stats.valid,
                      preview.stats.duplicates,
                    )}
                    {preview.columnMapping.preset ? (
                      <>
                        {" "}
                        {userCopy.warehouse.import.templatePrefix}{" "}
                        <span className="font-medium text-foreground">
                          {preview.columnMapping.preset.label}
                        </span>
                      </>
                    ) : null}
                  </p>
                ) : null}
              </motion.div>
            ) : null}

            {step === "review" ? (
              <motion.div
                key="review"
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -6 }}
                transition={{ duration: 0.2 }}
                className="space-y-4"
              >
                <div className="rounded-lg border bg-muted/20 p-3 text-sm">
                  <p>{userCopy.warehouse.import.selectedOf(selectedCount, rows.length)}</p>
                  {uncertainRows.length > 0 ? (
                    <p className="mt-1 text-warning-on-subtle">
                      {userCopy.warehouse.import.uncertainHint(uncertainRows.length)}
                    </p>
                  ) : null}
                </div>
                <PreviewTable rows={rows.slice(0, 150)} onToggle={toggleRow} />
              </motion.div>
            ) : null}

            {step === "confirm" ? (
              <motion.div
                key="confirm"
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -6 }}
                transition={{ duration: 0.2 }}
                className="space-y-4"
              >
                <div className="rounded-lg border p-4 text-sm">
                  <p className="font-medium">{userCopy.warehouse.import.confirmTitle(selectedCount)}</p>
                  <p className="mt-1 text-muted-foreground">
                    {userCopy.warehouse.import.createUpdate(
                      rows.filter((row) => row.action === "create" && row.selected).length,
                      rows.filter((row) => row.action === "update" && row.selected).length,
                    )}
                  </p>
                  <p className="mt-1 text-muted-foreground">
                    {userCopy.warehouse.import.withStock}{" "}
                    {rows.filter((row) => row.selected && Number(row.normalized.quantity ?? 0) > 0).length}
                  </p>
                </div>
                <label className="flex items-center gap-2 text-sm">
                  <input
                    type="checkbox"
                    checked={createExpense}
                    onChange={(event) => setCreateExpense(event.target.checked)}
                  />
                  {userCopy.warehouse.import.createExpense}
                </label>
                <p className="text-xs text-muted-foreground">
                  {userCopy.warehouse.import.afterUploadHint}
                </p>
              </motion.div>
            ) : null}
          </AnimatePresence>
        </div>

        <DialogFooter className="border-t px-6 py-4">
          <Button variant="outline" onClick={() => (loading ? minimizeImport() : handleDialogOpenChange(false))}>
            {loading ? userCopy.warehouse.import.collapse : userCopy.warehouse.import.cancel}
          </Button>
          {step !== "upload" ? (
            <Button variant="outline" onClick={goBack} disabled={loading}>
              {userCopy.warehouse.import.back}
            </Button>
          ) : null}
          {loading && step === "confirm" ? (
            <Button
              variant="outline"
              onClick={() => {
                cancelRef.current = true;
              }}
            >
              {userCopy.warehouse.import.stop}
            </Button>
          ) : null}
          <Button onClick={() => void goNext()} disabled={!canProceed()}>
            {step === "confirm" ? userCopy.warehouse.import.uploadToDb : userCopy.warehouse.import.next}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function PreviewTable({
  rows,
  onToggle,
}: {
  rows: InventoryImportRow[];
  onToggle: (rowIndex: number, selected: boolean) => void;
}) {
  return (
    <div className="overflow-auto rounded-lg border">
      <table className="min-w-full text-sm">
        <thead className="sticky top-0 bg-muted/80">
          <tr>
            <th className="px-3 py-2 text-left">✓</th>
            <th className="px-3 py-2 text-left">#</th>
            <th className="px-3 py-2 text-left">{userCopy.warehouse.import.colSku}</th>
            <th className="px-3 py-2 text-left">{userCopy.warehouse.import.colName}</th>
            <th className="px-3 py-2 text-left">{userCopy.warehouse.import.colQty}</th>
            <th className="px-3 py-2 text-left">{userCopy.warehouse.import.colPurchase}</th>
            <th className="px-3 py-2 text-left">{userCopy.warehouse.import.colSale}</th>
            <th className="px-3 py-2 text-left">{userCopy.warehouse.import.colStatus}</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => {
            const uncertain = row.aiMeta?.warnings.some((warning) => warning.includes(userCopy.warehouse.import.uncertainToken));
            const status =
              row.errors.length > 0
                ? row.errors[0]
                : row.duplicateOfItemId
                  ? userCopy.warehouse.import.statusUpdate
                  : row.summary ?? userCopy.warehouse.import.statusCreate;

            return (
              <tr
                key={row.rowIndex}
                className={cn(
                  "border-t transition-colors",
                  row.errors.length ? "bg-destructive/5" : "",
                  uncertain ? "bg-warning-subtle" : "",
                )}
              >
                <td className="px-3 py-2">
                  <input
                    type="checkbox"
                    checked={row.selected}
                    disabled={row.errors.length > 0}
                    onChange={(event) => onToggle(row.rowIndex, event.target.checked)}
                  />
                </td>
                <td className="px-3 py-2">{row.rowIndex}</td>
                <td className="px-3 py-2 font-mono text-xs">{String(row.normalized.sku ?? "")}</td>
                <td className="px-3 py-2">{String(row.normalized.name ?? "")}</td>
                <td className="px-3 py-2 tabular-nums">{String(row.normalized.quantity ?? "—")}</td>
                <td className="px-3 py-2 tabular-nums">{String(row.normalized.purchasePrice ?? "—")}</td>
                <td className="px-3 py-2 tabular-nums">{String(row.normalized.sellPrice ?? "—")}</td>
                <td className="px-3 py-2 text-xs text-muted-foreground">{status}</td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
