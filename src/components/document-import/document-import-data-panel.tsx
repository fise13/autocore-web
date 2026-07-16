"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { getAuth } from "firebase/auth";
import { motion } from "motion/react";
import { Loader2, Sparkles } from "lucide-react";

import type { DocumentImportJob } from "@/domain/document-import";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { getFirebaseApp } from "@/infrastructure/firebase/client";
import { cn } from "@/lib/utils";
import { formatDocumentImportToastCopy } from "@/lib/document-import/toast-copy";

type ExtractedEngine = {
  serialCode?: string;
  brandName?: string;
  engineCode?: string;
  configuration?: string;
  notes?: string;
  quantity?: number;
  vin?: string;
  price?: number | null;
  confidence?: number;
};

type ExtractedPayload = {
  engines?: ExtractedEngine[];
  extractedAt?: string;
};

type DocumentImportDataPanelProps = {
  job: DocumentImportJob | null;
  extractedData?: unknown | null;
  className?: string;
};

function parseExtracted(data: unknown): ExtractedPayload | null {
  if (!data || typeof data !== "object") return null;
  return data as ExtractedPayload;
}

export function DocumentImportDataPanel({
  job,
  extractedData,
  className,
}: DocumentImportDataPanelProps) {
  const [localExtracted, setLocalExtracted] = useState<ExtractedPayload | null>(
    () => parseExtracted(extractedData),
  );
  const [aiStatus, setAiStatus] = useState(job?.aiStatus ?? "idle");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    setLocalExtracted(parseExtracted(extractedData ?? job?.extractedData));
    setAiStatus(job?.aiStatus ?? "idle");
  }, [extractedData, job?.aiStatus, job?.extractedData, job?.id]);

  useEffect(() => {
    if (!job?.id || job.status !== "ready") return;
    if (job.aiStatus === "done" || job.aiStatus === "processing") return;
    if (parseExtracted(job.extractedData)?.engines?.length) return;
    void runExtract(false);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- auto-start once per job
  }, [job?.id, job?.status]);

  async function runExtract(force: boolean) {
    if (!job?.id || busy) return;
    setBusy(true);
    setError(null);
    setAiStatus("processing");
    try {
      const token = await getAuth(getFirebaseApp()).currentUser?.getIdToken();
      if (!token) throw new Error("Войдите в аккаунт");
      const response = await fetch(
        `/api/imports/${job.id}/extract${force ? "?force=1" : ""}`,
        {
          method: "POST",
          headers: { Authorization: `Bearer ${token}` },
        },
      );
      const body = (await response.json().catch(() => null)) as {
        error?: string;
        extractedData?: ExtractedPayload;
        aiStatus?: string;
      } | null;
      if (!response.ok) throw new Error(body?.error || "Не удалось распознать");
      setLocalExtracted(body?.extractedData ?? null);
      setAiStatus((body?.aiStatus as DocumentImportJob["aiStatus"]) ?? "done");
    } catch (err) {
      setAiStatus("failed");
      setError(err instanceof Error ? err.message : "Ошибка AI");
    } finally {
      setBusy(false);
    }
  }

  const engines = localExtracted?.engines ?? [];
  const titleCopy = job ? formatDocumentImportToastCopy(job).title : "Документ";

  return (
    <motion.aside
      initial={{ opacity: 0, x: 12 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ duration: 0.28, ease: [0.22, 1, 0.36, 1] }}
      className={cn(
        "flex h-full min-h-0 flex-col overflow-hidden rounded-2xl border bg-card/60 p-5 backdrop-blur-sm",
        className,
      )}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="space-y-1">
          <h2 className="text-lg font-semibold tracking-tight">Данные документа</h2>
          <p className="text-sm text-muted-foreground">{titleCopy}</p>
        </div>
        <Badge variant="secondary" className="rounded-full px-2.5 py-0.5 text-[11px] font-medium">
          {aiStatus === "processing" ? "AI…" : aiStatus === "done" ? "Готово" : "Beta"}
        </Badge>
      </div>

      <div className="mt-4 min-h-0 flex-1 overflow-y-auto">
        {aiStatus === "processing" || busy ? (
          <div className="flex flex-col items-center justify-center gap-3 rounded-xl border border-dashed bg-muted/20 px-5 py-10 text-center">
            <Loader2 className="size-5 animate-spin text-muted-foreground" />
            <p className="text-sm font-medium">Распознаём двигатели…</p>
            <p className="text-xs text-muted-foreground">Обычно 5–15 секунд</p>
          </div>
        ) : engines.length > 0 ? (
          <div className="space-y-2">
            {engines.map((engine, index) => (
              <div key={index} className="rounded-xl border bg-background/60 px-3 py-2.5">
                <p className="text-sm font-medium">
                  {[engine.brandName, engine.engineCode, engine.serialCode]
                    .filter(Boolean)
                    .join(" · ") || `Двигатель ${index + 1}`}
                </p>
                <p className="mt-1 text-xs text-muted-foreground">
                  {[
                    engine.quantity ? `×${engine.quantity}` : null,
                    typeof engine.confidence === "number"
                      ? `${Math.round(engine.confidence * 100)}%`
                      : null,
                    engine.vin ? `VIN ${engine.vin}` : null,
                  ]
                    .filter(Boolean)
                    .join(" · ")}
                </p>
                {engine.notes ? (
                  <p className="mt-1 text-xs text-muted-foreground line-clamp-2">{engine.notes}</p>
                ) : null}
              </div>
            ))}
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="mt-2 w-full"
              disabled={busy}
              onClick={() => void runExtract(true)}
            >
              <Sparkles className="size-3.5" />
              Перераспознать
            </Button>
            <Link
              href="/imports"
              className="inline-flex h-8 w-full items-center justify-center rounded-md bg-primary px-3 text-xs font-medium text-primary-foreground transition hover:bg-primary/90"
            >
              К списку импортов
            </Link>
          </div>
        ) : (
          <div className="flex flex-col items-start gap-3 rounded-xl border border-dashed bg-muted/20 px-5 py-8">
            <p className="text-sm font-medium text-foreground">
              {error ? "Не удалось распознать" : "Пока нет распознанных полей"}
            </p>
            <p className="max-w-sm text-sm leading-relaxed text-muted-foreground">
              {error ||
                "Нажмите кнопку — AI извлечёт бренд, код и серийный номер с фото."}
            </p>
            <Button
              type="button"
              size="sm"
              disabled={busy || !job}
              onClick={() => void runExtract(true)}
            >
              <Sparkles className="size-3.5" />
              Распознать
            </Button>
          </div>
        )}
      </div>

      {job ? (
        <div className="mt-4 space-y-2 border-t pt-4 text-xs text-muted-foreground">
          <div className="flex justify-between gap-3">
            <span>Статус</span>
            <span className="font-medium text-foreground capitalize">{job.status}</span>
          </div>
          <div className="flex justify-between gap-3">
            <span>Создан</span>
            <span className="font-medium text-foreground">
              {job.createdAt.toLocaleString("ru-RU")}
            </span>
          </div>
        </div>
      ) : null}
    </motion.aside>
  );
}
