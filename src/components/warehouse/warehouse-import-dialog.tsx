"use client";

import { ChangeEvent, useMemo, useState } from "react";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { InventoryImportRow } from "@/domain/inventory-import";
import { parseCsvText } from "@/lib/warehouse/import-rules-engine";

type WarehouseImportDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onPreview: (input: {
    sourceFileName?: string;
    headers: string[];
    rows: Record<string, string>[];
  }) => Promise<{ rows: InventoryImportRow[]; stats: { total: number; valid: number; duplicates: number; errors: number } }>;
  onApply: (rows: InventoryImportRow[]) => Promise<{ applied: number }>;
};

export function WarehouseImportDialog({
  open,
  onOpenChange,
  onPreview,
  onApply,
}: WarehouseImportDialogProps) {
  const [previewRows, setPreviewRows] = useState<InventoryImportRow[]>([]);
  const [stats, setStats] = useState<{ total: number; valid: number; duplicates: number; errors: number } | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const selectedCount = useMemo(
    () => previewRows.filter((row) => row.selected && row.errors.length === 0).length,
    [previewRows],
  );

  async function handleFile(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) return;
    setLoading(true);
    setError(null);
    try {
      const text = await file.text();
      const parsed = parseCsvText(text);
      const preview = await onPreview({
        sourceFileName: file.name,
        headers: parsed.headers,
        rows: parsed.rows,
      });
      setPreviewRows(preview.rows);
      setStats(preview.stats);
    } catch (fileError) {
      setError(fileError instanceof Error ? fileError.message : "Ошибка чтения файла");
    } finally {
      setLoading(false);
    }
  }

  async function applySelected() {
    setLoading(true);
    setError(null);
    try {
      const result = await onApply(previewRows.filter((row) => row.selected));
      onOpenChange(false);
      setPreviewRows([]);
      setStats(null);
      alert(`Импортировано строк: ${result.applied}`);
    } catch (applyError) {
      setError(applyError instanceof Error ? applyError.message : "Ошибка импорта");
    } finally {
      setLoading(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl">
        <DialogHeader>
          <DialogTitle>Импорт склада</DialogTitle>
          <DialogDescription>Загрузите CSV/TSV. AI-подсказки и diff — на этапе preview.</DialogDescription>
        </DialogHeader>
        <div className="grid gap-4">
          <input type="file" accept=".csv,.tsv,.txt" onChange={handleFile} />
          {stats ? (
            <p className="text-sm text-muted-foreground">
              Всего: {stats.total} · валидных: {stats.valid} · дубликатов: {stats.duplicates} · ошибок: {stats.errors}
            </p>
          ) : null}
          {previewRows.length > 0 ? (
            <div className="max-h-72 overflow-auto rounded-lg border">
              <table className="w-full text-sm">
                <thead className="sticky top-0 bg-muted/80">
                  <tr>
                    <th className="px-2 py-1 text-left">✓</th>
                    <th className="px-2 py-1 text-left">Артикул</th>
                    <th className="px-2 py-1 text-left">Название</th>
                    <th className="px-2 py-1 text-left">Qty</th>
                    <th className="px-2 py-1 text-left">Conf.</th>
                    <th className="px-2 py-1 text-left">Ошибки</th>
                  </tr>
                </thead>
                <tbody>
                  {previewRows.slice(0, 100).map((row) => (
                    <tr key={row.rowIndex} className="border-t">
                      <td className="px-2 py-1">
                        <input
                          type="checkbox"
                          checked={row.selected}
                          disabled={row.errors.length > 0}
                          onChange={(event) => {
                            setPreviewRows((current) =>
                              current.map((item) =>
                                item.rowIndex === row.rowIndex
                                  ? { ...item, selected: event.target.checked }
                                  : item,
                              ),
                            );
                          }}
                        />
                      </td>
                      <td className="px-2 py-1">{String(row.normalized.sku ?? "")}</td>
                      <td className="px-2 py-1">{String(row.normalized.name ?? "")}</td>
                      <td className="px-2 py-1">{String(row.normalized.quantity ?? "")}</td>
                      <td className="px-2 py-1">{Math.round(row.confidence * 100)}%</td>
                      <td className="px-2 py-1 text-destructive">{row.errors.join(", ")}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : null}
          {error ? <p className="text-sm text-destructive">{error}</p> : null}
        </div>
        <DialogFooter>
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Закрыть</Button>
          <Button type="button" disabled={loading || selectedCount === 0} onClick={() => void applySelected()}>
            Применить ({selectedCount})
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
