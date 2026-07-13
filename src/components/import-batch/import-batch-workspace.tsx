"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useRef, useState } from "react";
import { getAuth } from "firebase/auth";
import {
  ArrowLeft,
  Check,
  FileUp,
  Loader2,
  Smartphone,
  Trash2,
} from "lucide-react";

import type { ImportSuggestedRow } from "@/domain/import-batch";
import { ImportPhoneQrSheet } from "@/components/import-batch/import-phone-qr-sheet";
import { useAuth } from "@/components/providers/auth-provider";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import {
  useImportBatchFilesRealtime,
  useImportBatchRealtime,
  useImportBatchRowsRealtime,
} from "@/hooks/use-import-batches-realtime";
import { getFirebaseApp } from "@/infrastructure/firebase/client";
import { uploadImportBatchFileClient } from "@/lib/import-batch/fetch-import-batches.client";
import { normalizeCompanyId } from "@/lib/company-id";
import { cn } from "@/lib/utils";

type ImportBatchWorkspaceProps = {
  batchId: string;
};

export function ImportBatchWorkspace({ batchId }: ImportBatchWorkspaceProps) {
  const router = useRouter();
  const { profile } = useAuth();
  const companyId = normalizeCompanyId(profile?.companyId);
  const { batch, loading: batchLoading } = useImportBatchRealtime(companyId, batchId);
  const { files } = useImportBatchFilesRealtime(batchId);
  const { rows } = useImportBatchRowsRealtime(batchId);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [phoneOpen, setPhoneOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function authHeader(): Promise<string> {
    const token = await getAuth(getFirebaseApp()).currentUser?.getIdToken();
    if (!token) throw new Error("Войдите в аккаунт");
    return `Bearer ${token}`;
  }

  async function patchRow(rowId: string, patch: Partial<ImportSuggestedRow>) {
    const response = await fetch(`/api/import-batches/${batchId}/rows/${rowId}`, {
      method: "PATCH",
      headers: {
        Authorization: await authHeader(),
        "Content-Type": "application/json",
      },
      body: JSON.stringify(patch),
    });
    if (!response.ok) {
      const body = (await response.json().catch(() => null)) as { error?: string } | null;
      throw new Error(body?.error || "Не удалось сохранить");
    }
  }

  async function commit() {
    setBusy(true);
    setError(null);
    try {
      const response = await fetch(`/api/import-batches/${batchId}/commit`, {
        method: "POST",
        headers: {
          Authorization: await authHeader(),
          "Content-Type": "application/json",
        },
        body: JSON.stringify({}),
      });
      const body = (await response.json().catch(() => null)) as {
        error?: string;
        imported?: number;
      } | null;
      if (!response.ok) throw new Error(body?.error || "Импорт не удался");
      router.push(batch?.target === "warehouse" ? "/warehouse" : "/motors");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Ошибка");
    } finally {
      setBusy(false);
    }
  }

  async function rollback() {
    setBusy(true);
    setError(null);
    try {
      const response = await fetch(`/api/import-batches/${batchId}/commit`, {
        method: "DELETE",
        headers: { Authorization: await authHeader() },
      });
      if (!response.ok) {
        const body = (await response.json().catch(() => null)) as { error?: string } | null;
        throw new Error(body?.error || "Откат не удался");
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Ошибка");
    } finally {
      setBusy(false);
    }
  }

  async function onFiles(fileList: FileList | null) {
    if (!fileList?.length) return;
    setBusy(true);
    setError(null);
    try {
      for (const file of Array.from(fileList)) {
        await uploadImportBatchFileClient({ batchId, file });
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Загрузка не удалась");
    } finally {
      setBusy(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  }

  async function selectAll(selected: boolean) {
    setBusy(true);
    try {
      await Promise.all(rows.map((row) => patchRow(row.id, { selected })));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Ошибка");
    } finally {
      setBusy(false);
    }
  }

  if (batchLoading && !batch) {
    return (
      <div className="space-y-4 p-6">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-40 w-full" />
      </div>
    );
  }

  if (!batch) {
    return (
      <div className="p-8 text-sm text-muted-foreground">
        Сессия не найдена.{" "}
        <Link href="/imports" className="text-foreground underline">
          К списку
        </Link>
      </div>
    );
  }

  const selectedCount = rows.filter((r) => r.selected).length;
  const canCommit =
    selectedCount > 0 &&
    batch.status !== "completed" &&
    batch.status !== "applying" &&
    batch.status !== "expired" &&
    batch.status !== "cancelled";

  return (
    <div className="flex h-full min-h-0 flex-col">
      <header className="flex flex-wrap items-center gap-3 border-b px-4 py-3 md:px-6">
        <Link
          href="/imports"
          aria-label="Назад"
          className="inline-flex size-9 items-center justify-center rounded-md text-muted-foreground transition hover:bg-muted hover:text-foreground"
        >
          <ArrowLeft className="size-4" />
        </Link>
        <div className="min-w-0 flex-1">
          <h1 className="truncate text-lg font-semibold tracking-tight">
            {batch.title || "Импорт двигателей"}
          </h1>
          <p className="text-xs text-muted-foreground">
            {batch.counts.files} файл. · {batch.counts.rows} строк · {selectedCount} выбрано
            {batch.aiStatus === "processing" ? " · AI работает…" : null}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button type="button" variant="outline" size="sm" onClick={() => setPhoneOpen(true)}>
            <Smartphone className="size-4" />
            Телефон
          </Button>
          <Button
            type="button"
            variant="outline"
            size="sm"
            disabled={busy}
            onClick={() => fileInputRef.current?.click()}
          >
            <FileUp className="size-4" />
            Файлы
          </Button>
          <input
            ref={fileInputRef}
            type="file"
            multiple
            accept="image/*,.pdf,.xlsx,.xls,.csv,application/pdf"
            className="hidden"
            onChange={(event) => void onFiles(event.target.files)}
          />
          {batch.status === "completed" ? (
            <Button type="button" variant="destructive" size="sm" disabled={busy} onClick={() => void rollback()}>
              <Trash2 className="size-4" />
              Откатить
            </Button>
          ) : (
            <Button type="button" size="sm" disabled={!canCommit || busy} onClick={() => void commit()}>
              {busy ? <Loader2 className="size-4 animate-spin" /> : <Check className="size-4" />}
              Импортировать {selectedCount || ""}
            </Button>
          )}
        </div>
      </header>

      {error || batch.error ? (
        <div className="border-b border-destructive/30 bg-destructive/5 px-4 py-2 text-sm text-destructive">
          {error || batch.error}
        </div>
      ) : null}

      <div className="grid min-h-0 flex-1 gap-0 lg:grid-cols-[220px_1fr]">
        <aside className="border-b border-border/80 p-3 lg:border-b-0 lg:border-r">
          <p className="mb-2 text-xs font-medium uppercase tracking-wide text-muted-foreground">
            Файлы
          </p>
          <div className="flex gap-2 overflow-x-auto lg:flex-col lg:overflow-visible">
            {files.length === 0 ? (
              <p className="text-xs text-muted-foreground">Пока пусто — добавьте с телефона или с диска</p>
            ) : (
              files.map((file) => (
                <div
                  key={file.id}
                  className="flex w-36 shrink-0 flex-col gap-1 rounded-xl border bg-card/60 p-2 lg:w-full"
                >
                  {file.previewDownloadUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={file.previewDownloadUrl}
                      alt=""
                      className="aspect-video w-full rounded-lg object-cover"
                    />
                  ) : (
                    <div className="flex aspect-video items-center justify-center rounded-lg bg-muted text-[10px] text-muted-foreground">
                      {file.kind}
                    </div>
                  )}
                  <p className="truncate text-[11px] font-medium">{file.fileName || file.kind}</p>
                  <p className="text-[10px] text-muted-foreground">{file.status}</p>
                  {file.error ? (
                    <p className="text-[10px] text-destructive line-clamp-2">{file.error}</p>
                  ) : null}
                </div>
              ))
            )}
          </div>
        </aside>

        <div className="min-h-0 overflow-auto p-3 md:p-4">
          <div className="mb-3 flex items-center justify-between gap-2">
            <p className="text-sm font-medium">Предпросмотр строк</p>
            <div className="flex gap-2">
              <Button type="button" variant="ghost" size="sm" disabled={busy || rows.length === 0} onClick={() => void selectAll(true)}>
                Выбрать все
              </Button>
              <Button type="button" variant="ghost" size="sm" disabled={busy || rows.length === 0} onClick={() => void selectAll(false)}>
                Снять
              </Button>
            </div>
          </div>

          {rows.length === 0 ? (
            <div className="flex flex-col items-center justify-center gap-2 rounded-2xl border border-dashed px-6 py-16 text-center">
              {batch.aiStatus === "processing" ? (
                <>
                  <Loader2 className="size-5 animate-spin text-muted-foreground" />
                  <p className="text-sm font-medium">AI разбирает файлы…</p>
                </>
              ) : (
                <>
                  <p className="text-sm font-medium">Строк пока нет</p>
                  <p className="max-w-sm text-sm text-muted-foreground">
                    Добавьте фото или Excel — распознанные двигатели появятся здесь автоматически.
                  </p>
                </>
              )}
            </div>
          ) : (
            <div className="overflow-x-auto rounded-xl border">
              <table className="w-full min-w-[720px] text-left text-sm">
                <thead className="border-b bg-muted/40 text-xs text-muted-foreground">
                  <tr>
                    <th className="w-10 px-3 py-2" />
                    <th className="px-2 py-2 font-medium">Бренд</th>
                    <th className="px-2 py-2 font-medium">Код</th>
                    <th className="px-2 py-2 font-medium">Серийный</th>
                    <th className="px-2 py-2 font-medium">Кол-во</th>
                    <th className="px-2 py-2 font-medium">Заметки</th>
                    <th className="px-2 py-2 font-medium">AI</th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map((row) => (
                    <ReviewRow
                      key={row.id}
                      row={row}
                      disabled={busy || batch.status === "completed"}
                      onPatch={(patch) => void patchRow(row.id, patch).catch((err) => setError(err.message))}
                    />
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      <ImportPhoneQrSheet batchId={batchId} open={phoneOpen} onOpenChange={setPhoneOpen} />
    </div>
  );
}

function ReviewRow({
  row,
  disabled,
  onPatch,
}: {
  row: ImportSuggestedRow;
  disabled?: boolean;
  onPatch: (patch: Partial<ImportSuggestedRow>) => void;
}) {
  const low = row.confidence < 0.55;

  return (
    <tr
      className={cn(
        "border-b last:border-0",
        !row.selected && "opacity-50",
        low && "bg-amber-500/5",
      )}
    >
      <td className="px-3 py-2">
        <input
          type="checkbox"
          className="size-4 accent-primary"
          checked={row.selected}
          disabled={disabled}
          onChange={(event) => onPatch({ selected: event.target.checked })}
          aria-label="Выбрать строку"
        />
      </td>
      <td className="px-2 py-1.5">
        <Input
          className="h-8"
          defaultValue={row.brandName}
          disabled={disabled}
          onBlur={(event) => {
            if (event.target.value !== row.brandName) onPatch({ brandName: event.target.value });
          }}
        />
      </td>
      <td className="px-2 py-1.5">
        <Input
          className="h-8"
          defaultValue={row.engineCode}
          disabled={disabled}
          onBlur={(event) => {
            if (event.target.value !== row.engineCode) onPatch({ engineCode: event.target.value });
          }}
        />
      </td>
      <td className="px-2 py-1.5">
        <Input
          className="h-8"
          defaultValue={row.serialCode}
          disabled={disabled}
          onBlur={(event) => {
            if (event.target.value !== row.serialCode) onPatch({ serialCode: event.target.value });
          }}
        />
      </td>
      <td className="px-2 py-1.5">
        <Input
          className="h-8 w-16"
          type="number"
          min={1}
          defaultValue={row.quantity}
          disabled={disabled}
          onBlur={(event) => {
            const quantity = Number(event.target.value);
            if (Number.isFinite(quantity) && quantity !== row.quantity) {
              onPatch({ quantity: Math.max(1, Math.round(quantity)) });
            }
          }}
        />
      </td>
      <td className="px-2 py-1.5">
        <Input
          className="h-8"
          defaultValue={row.notes}
          disabled={disabled}
          onBlur={(event) => {
            if (event.target.value !== row.notes) onPatch({ notes: event.target.value });
          }}
        />
      </td>
      <td className="px-2 py-2 text-xs text-muted-foreground">
        {Math.round(row.confidence * 100)}%
        {row.errors[0] ? (
          <span className="mt-0.5 block text-destructive">{row.errors[0]}</span>
        ) : null}
      </td>
    </tr>
  );
}
