"use client";

import { useCallback, useEffect, useRef, useState, type ReactNode } from "react";
import Link from "next/link";
import { getAuth } from "firebase/auth";
import { motion } from "motion/react";
import { LoaderCircle, Plus, Sparkles, Trash2 } from "lucide-react";

import type { DocumentImportJob } from "@/domain/document-import";
import { LastSavedHint } from "@/components/persistence/last-saved-hint";
import { usePersistedDocument } from "@/components/persistence/use-persisted-document";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { getFirebaseApp } from "@/infrastructure/firebase/client";
import type { PersistenceSyncHandler } from "@/lib/persistence";
import { cn } from "@/lib/utils";
import { formatDocumentImportToastCopy } from "@/lib/document-import/toast-copy";
import { emitKnowledgeEvent } from "@/lib/knowledge/knowledge-api.client";
import { getActiveUserCopyLocale, userCopy } from "@/lib/user-copy";

export type ExtractedEngine = {
  serialCode?: string;
  brandName?: string;
  engineCode?: string;
  configuration?: string;
  notes?: string;
  quantity?: number;
  transmission?: string;
  warehouseLocation?: string;
  arrivalDate?: string;
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

function emptyEngine(): ExtractedEngine {
  return {
    brandName: "",
    engineCode: "",
    serialCode: "",
    configuration: "",
    notes: "",
    quantity: 1,
    transmission: "",
    warehouseLocation: "",
    arrivalDate: "",
  };
}

function Field({
  label,
  children,
}: {
  label: string;
  children: ReactNode;
}) {
  return (
    <label className="grid gap-1">
      <span className="text-[11px] font-medium text-muted-foreground">{label}</span>
      {children}
    </label>
  );
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
  const [saving, setSaving] = useState(false);
  const [dirty, setDirty] = useState(false);
  const [saveHint, setSaveHint] = useState<string | null>(null);
  const dirtyRef = useRef(false);
  dirtyRef.current = dirty;
  /** Snapshot of the last AI-produced values, used to detect user corrections on blur/save. */
  const aiBaselineRef = useRef<ExtractedPayload | null>(null);

  useEffect(() => {
    if (dirtyRef.current) return;
    const parsed = parseExtracted(extractedData ?? job?.extractedData);
    setLocalExtracted(parsed);
    aiBaselineRef.current = parsed;
    setAiStatus(job?.aiStatus ?? "idle");
  }, [extractedData, job?.aiStatus, job?.extractedData, job?.id]);

  useEffect(() => {
    if (!job?.id || job.status !== "ready") return;
    if (job.aiStatus === "done" || job.aiStatus === "processing") return;
    if (parseExtracted(job.extractedData)?.engines?.length) return;
    void runExtract(false);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- auto-start once per job
  }, [job?.id, job?.status]);

  async function authHeaders(): Promise<HeadersInit> {
    const token = await getAuth(getFirebaseApp()).currentUser?.getIdToken();
    if (!token) throw new Error(userCopy.documentImport.signIn);
    return {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    };
  }

  async function runExtract(force: boolean) {
    if (!job?.id || busy) return;
    setBusy(true);
    setError(null);
    setAiStatus("processing");
    setDirty(false);
    try {
      const response = await fetch(
        `/api/imports/${job.id}/extract${force ? "?force=1" : ""}`,
        {
          method: "POST",
          headers: await authHeaders(),
        },
      );
      const body = (await response.json().catch(() => null)) as {
        error?: string;
        extractedData?: ExtractedPayload;
        aiStatus?: string;
      } | null;
      if (!response.ok) throw new Error(body?.error || userCopy.documentImport.recognizeFailed);
      setLocalExtracted(body?.extractedData ?? null);
      aiBaselineRef.current = body?.extractedData ?? null;
      setAiStatus((body?.aiStatus as DocumentImportJob["aiStatus"]) ?? "done");
      setSaveHint(null);
    } catch (err) {
      setAiStatus("failed");
      setError(err instanceof Error ? err.message : userCopy.documentImport.aiError);
    } finally {
      setBusy(false);
    }
  }

  /** AI values the user saved unchanged count as confirmed OCR reads for that field. */
  function emitOcrLineConfirmations(engines: ExtractedEngine[]) {
    const baselineEngines = aiBaselineRef.current?.engines ?? [];
    engines.forEach((engine, index) => {
      const baseline = baselineEngines[index];
      if (!baseline) return;
      (["engineCode", "serialCode", "brandName"] as const).forEach((field) => {
        const rawText = String(baseline[field] ?? "").trim();
        const confirmedValue = String(engine[field] ?? "").trim();
        if (!rawText || !confirmedValue || rawText !== confirmedValue) return;
        void emitKnowledgeEvent({
          type: "ocr.line_confirmed",
          payload: { fieldKey: field, rawText, confirmedValue },
        });
      });
    });
  }

  function handleFieldBlur(index: number, field: keyof ExtractedEngine, currentValue: unknown) {
    const baselineValue = aiBaselineRef.current?.engines?.[index]?.[field];
    const from = String(baselineValue ?? "").trim();
    const to = String(currentValue ?? "").trim();
    if (!from || !to || from === to) return;
    void emitKnowledgeEvent({
      type: "import.cell_corrected",
      payload: { field, from, to },
    });
  }

  function updateEngine(index: number, patch: Partial<ExtractedEngine>) {
    setLocalExtracted((current) => {
      const engines = [...(current?.engines ?? [])];
      engines[index] = { ...engines[index], ...patch };
      return {
        engines,
        extractedAt: current?.extractedAt ?? new Date().toISOString(),
      };
    });
    setDirty(true);
    setSaveHint(null);
  }

  function addEngine() {
    setLocalExtracted((current) => ({
      engines: [...(current?.engines ?? []), emptyEngine()],
      extractedAt: current?.extractedAt ?? new Date().toISOString(),
    }));
    setDirty(true);
    setSaveHint(null);
  }

  function removeEngine(index: number) {
    setLocalExtracted((current) => ({
      engines: (current?.engines ?? []).filter((_, i) => i !== index),
      extractedAt: current?.extractedAt ?? new Date().toISOString(),
    }));
    setDirty(true);
    setSaveHint(null);
  }

  async function saveEdits() {
    if (!job?.id || saving) return;
    setSaving(true);
    setError(null);
    try {
      const payload: ExtractedPayload = {
        engines: localExtracted?.engines ?? [],
        extractedAt: new Date().toISOString(),
      };
      const response = await fetch(`/api/imports/${job.id}`, {
        method: "PATCH",
        headers: await authHeaders(),
        body: JSON.stringify({ extractedData: payload }),
      });
      const body = (await response.json().catch(() => null)) as {
        error?: string;
        extractedData?: ExtractedPayload;
      } | null;
      if (!response.ok) throw new Error(body?.error || userCopy.documentImport.saveFailed);
      emitOcrLineConfirmations(payload.engines ?? []);
      setLocalExtracted(body?.extractedData ?? payload);
      aiBaselineRef.current = body?.extractedData ?? payload;
      setDirty(false);
      setSaveHint(userCopy.documentImport.saved);
      setAiStatus("done");
    } catch (err) {
      setError(err instanceof Error ? err.message : userCopy.documentImport.saveError);
    } finally {
      setSaving(false);
    }
  }

  const importKey =
    job?.companyId && job?.id
      ? { companyId: job.companyId, kind: "document_import" as const, id: job.id }
      : null;

  const importSync = useCallback<PersistenceSyncHandler>(
    async ({ snapshot }) => {
      if (!job?.id) return { ok: false, error: userCopy.documentImport.noJob };
      try {
        const payload = snapshot as ExtractedPayload;
        const response = await fetch(`/api/imports/${job.id}`, {
          method: "PATCH",
          headers: await authHeaders(),
          body: JSON.stringify({ extractedData: payload }),
        });
        if (!response.ok) {
          const body = (await response.json().catch(() => null)) as { error?: string } | null;
          return { ok: false, error: body?.error || userCopy.documentImport.saveFailed };
        }
        setDirty(false);
        setSaveHint(userCopy.documentImport.saved);
        return { ok: true };
      } catch (err) {
        return {
          ok: false,
          error: err instanceof Error ? err.message : userCopy.documentImport.saveError,
        };
      }
    },
    [job?.id],
  );

  usePersistedDocument({
    key: importKey,
    value: localExtracted,
    label: job ? formatDocumentImportToastCopy(job).title : userCopy.documentImport.title,
    sync: importSync,
    enabled: Boolean(importKey) && dirty,
    patchOnEnable: true,
  });

  const engines = localExtracted?.engines ?? [];
  const titleCopy = job ? formatDocumentImportToastCopy(job).title : userCopy.documentImport.documentFallback;
  const dateLocale = getActiveUserCopyLocale() === "en" ? "en-US" : "ru-RU";

  return (
    <motion.aside
      initial={{ opacity: 0, x: 12 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ duration: 0.28, ease: [0.22, 1, 0.36, 1] }}
      className={cn(
        "flex h-full min-h-0 flex-col overflow-hidden rounded-2xl border bg-card/60 p-4 backdrop-blur-sm sm:p-5",
        className,
      )}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="space-y-1">
          <h2 className="text-lg font-semibold tracking-tight">{userCopy.documentImport.dataTitle}</h2>
          <p className="text-sm text-muted-foreground">{titleCopy}</p>
        </div>
        <Badge variant="secondary" className="rounded-full px-2.5 py-0.5 text-[11px] font-medium">
          {aiStatus === "processing" ? userCopy.documentImport.aiBusy : dirty ? userCopy.documentImport.dirty : aiStatus === "done" ? userCopy.documentImport.ready : userCopy.documentImport.beta}
        </Badge>
      </div>

      <div className="mt-4 min-h-0 flex-1 overflow-y-auto pr-0.5">
        {aiStatus === "processing" || busy ? (
          <div className="flex flex-col items-center justify-center gap-3 rounded-xl border border-dashed bg-muted/20 px-5 py-10 text-center">
            <LoaderCircle className="size-5 animate-spin text-muted-foreground" />
            <p className="text-sm font-medium">{userCopy.documentImport.recognizing}</p>
            <p className="text-xs text-muted-foreground">{userCopy.documentImport.recognizingHint}</p>
          </div>
        ) : engines.length > 0 || dirty ? (
          <div className="space-y-3">
            {engines.map((engine, index) => (
              <div key={index} className="space-y-2.5 rounded-xl border bg-background/60 p-3">
                <div className="flex items-center justify-between gap-2">
                  <p className="text-xs font-semibold text-muted-foreground">
                    {userCopy.documentImport.engineN(index + 1)}
                    {typeof engine.confidence === "number" ? (
                      <span className="ml-2 font-normal">
                        · {Math.round(engine.confidence * 100)}%
                      </span>
                    ) : null}
                  </p>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="h-7 px-2 text-muted-foreground hover:text-destructive"
                    onClick={() => removeEngine(index)}
                    aria-label={userCopy.documentImport.removeEngineAria(index + 1)}
                  >
                    <Trash2 className="size-3.5" />
                  </Button>
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <Field label={userCopy.documentImport.fields.brand}>
                    <Input
                      value={engine.brandName ?? ""}
                      onChange={(event) => updateEngine(index, { brandName: event.target.value })}
                      onBlur={(event) => handleFieldBlur(index, "brandName", event.target.value)}
                      placeholder="SUBARU"
                      className="h-8"
                    />
                  </Field>
                  <Field label={userCopy.documentImport.fields.engine}>
                    <Input
                      value={engine.engineCode ?? ""}
                      onChange={(event) => updateEngine(index, { engineCode: event.target.value })}
                      onBlur={(event) => handleFieldBlur(index, "engineCode", event.target.value)}
                      placeholder="EJ25"
                      className="h-8"
                    />
                  </Field>
                  <div className="col-span-2">
                    <Field label={userCopy.documentImport.fields.serial}>
                      <Input
                        value={engine.serialCode ?? ""}
                        onChange={(event) => updateEngine(index, { serialCode: event.target.value })}
                        onBlur={(event) => handleFieldBlur(index, "serialCode", event.target.value)}
                        className="h-8"
                      />
                    </Field>
                  </div>
                  <Field label={userCopy.documentImport.fields.configuration}>
                    <Input
                      value={engine.configuration ?? ""}
                      onChange={(event) =>
                        updateEngine(index, { configuration: event.target.value })
                      }
                      className="h-8"
                    />
                  </Field>
                  <Field label={userCopy.documentImport.fields.qty}>
                    <Input
                      type="number"
                      min={1}
                      value={engine.quantity ?? 1}
                      onChange={(event) =>
                        updateEngine(index, {
                          quantity: Math.max(1, Number(event.target.value) || 1),
                        })
                      }
                      className="h-8"
                    />
                  </Field>
                  <Field label={userCopy.documentImport.fields.transmission}>
                    <Input
                      value={engine.transmission ?? ""}
                      onChange={(event) =>
                        updateEngine(index, { transmission: event.target.value })
                      }
                      className="h-8"
                    />
                  </Field>
                  <Field label={userCopy.documentImport.fields.location}>
                    <Input
                      value={engine.warehouseLocation ?? ""}
                      onChange={(event) =>
                        updateEngine(index, { warehouseLocation: event.target.value })
                      }
                      className="h-8"
                    />
                  </Field>
                  <div className="col-span-2">
                    <Field label={userCopy.documentImport.fields.arrivalDate}>
                      <Input
                        type="date"
                        value={engine.arrivalDate ?? ""}
                        onChange={(event) =>
                          updateEngine(index, { arrivalDate: event.target.value })
                        }
                        className="h-8"
                      />
                    </Field>
                  </div>
                </div>

                <Field label={userCopy.documentImport.fields.notes}>
                  <Textarea
                    value={engine.notes ?? ""}
                    onChange={(event) => updateEngine(index, { notes: event.target.value })}
                    rows={2}
                    className="min-h-14 resize-y"
                  />
                </Field>
              </div>
            ))}

            {error ? <p className="text-xs text-destructive">{error}</p> : null}
            {saveHint ? <p className="text-xs text-muted-foreground">{saveHint}</p> : null}
            {importKey && dirty ? <LastSavedHint persistenceKey={importKey} /> : null}

            <div className="flex flex-col gap-2 pt-1">
              <Button type="button" variant="outline" size="sm" className="w-full" onClick={addEngine}>
                <Plus className="size-3.5" />
                {userCopy.documentImport.addRow}
              </Button>
              <Button
                type="button"
                size="sm"
                className="w-full"
                disabled={!dirty || saving || !job}
                onClick={() => void saveEdits()}
              >
                {saving ? <LoaderCircle className="size-3.5 animate-spin" /> : null}
                {userCopy.documentImport.saveChanges}
              </Button>
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="w-full"
                disabled={busy}
                onClick={() => void runExtract(true)}
              >
                <Sparkles className="size-3.5" />
                {userCopy.documentImport.reRecognize}
              </Button>
              <Link
                href="/imports"
                className="inline-flex h-8 w-full items-center justify-center rounded-md border border-transparent bg-muted/60 px-3 text-xs font-medium transition hover:bg-muted"
              >
                {userCopy.documentImport.backToList}
              </Link>
            </div>
          </div>
        ) : (
          <div className="flex flex-col items-start gap-3 rounded-xl border border-dashed bg-muted/20 px-5 py-8">
            <p className="text-sm font-medium text-foreground">
              {error ? userCopy.documentImport.recognizeFailed : userCopy.documentImport.noFieldsYet}
            </p>
            <p className="max-w-sm text-sm leading-relaxed text-muted-foreground">
              {error ||
                userCopy.documentImport.extractHint}
            </p>
            <div className="flex flex-wrap gap-2">
              <Button
                type="button"
                size="sm"
                disabled={busy || !job}
                onClick={() => void runExtract(true)}
              >
                <Sparkles className="size-3.5" />
                {userCopy.documentImport.recognize}
              </Button>
              <Button type="button" size="sm" variant="outline" onClick={addEngine}>
                <Plus className="size-3.5" />
                {userCopy.documentImport.enterManually}
              </Button>
            </div>
          </div>
        )}
      </div>

      {job ? (
        <div className="mt-4 space-y-2 border-t pt-4 text-xs text-muted-foreground">
          <div className="flex justify-between gap-3">
            <span>{userCopy.documentImport.statusLabel}</span>
            <span className="font-medium text-foreground capitalize">{job.status}</span>
          </div>
          <div className="flex justify-between gap-3">
            <span>{userCopy.documentImport.createdLabel}</span>
            <span className="font-medium text-foreground">
              {job.createdAt.toLocaleString(dateLocale)}
            </span>
          </div>
        </div>
      ) : null}
    </motion.aside>
  );
}
