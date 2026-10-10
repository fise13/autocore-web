"use client";

import { TriangleAlert, CircleCheck, Info, RotateCcw } from "lucide-react";

import { Button } from "@/components/ui/button";
import type { CommitPlanResult } from "@/lib/import/business/commit-plan";

/**
 * What actually happened, including what did not.
 *
 * Two things this refuses to do. It never counts a record as imported when
 * nothing wrote it — sales and customers are recognised by the pipeline and
 * have no writer yet, and reporting them as imported would be a lie the person
 * only discovers when they go looking for them. And it never calls a run that
 * wrote 632 of 710 records a failure: that is a resumable state, and telling
 * someone their import failed is the fastest way to make them import it all
 * over again.
 */
export function ImportCompleteView({
  result,
  status,
  deferred,
  onResume,
  onOpenMotors,
  onOpenWarehouse,
  onReset,
  busy,
}: {
  result: CommitPlanResult;
  status: "completed" | "partial";
  deferred: string[];
  onResume: () => void;
  onOpenMotors: () => void;
  onOpenWarehouse: () => void;
  onReset: () => void;
  busy?: boolean;
}) {
  const processed = result.created + result.updated + result.skipped;
  const total = processed + result.failed.length;

  return (
    <div className="mx-auto flex w-full max-w-2xl flex-col gap-6 px-6 py-16">
      <header className="flex flex-col items-center gap-2 text-center">
        {status === "completed" ? (
          <CircleCheck className="size-12 text-success-on-subtle" aria-hidden />
        ) : (
          <TriangleAlert className="size-12 text-warning-on-subtle" aria-hidden />
        )}
        <h2 className="font-heading text-2xl font-semibold tracking-tight">
          {status === "completed" ? "Импорт завершён" : "Импорт завершён частично"}
        </h2>
        {status === "partial" ? (
          <p className="text-sm text-muted-foreground">
            Перенесено {processed} из {total} записей. Импорт можно безопасно продолжить — уже
            перенесённое не создастся заново.
          </p>
        ) : null}
      </header>

      <section className="grid gap-2 sm:grid-cols-3">
        <Stat label="Создано" value={result.created} />
        <Stat label="Обновлено" value={result.updated} />
        <Stat label="Пропущено" value={result.skipped} />
      </section>

      {result.linked > 0 ? (
        <p className="text-center text-sm text-muted-foreground">
          Связано записей: <span className="font-medium text-foreground">{result.linked}</span>
        </p>
      ) : null}

      {result.review > 0 ? (
        <p className="inline-flex items-center justify-center gap-2 text-sm text-warning-on-subtle">
          <TriangleAlert className="size-4" aria-hidden />
          {result.review} записей остались на проверке и не были перенесены
        </p>
      ) : null}

      {deferred.length > 0 ? (
        <div className="flex items-start gap-2 rounded-xl border bg-muted/40 px-4 py-3">
          <Info className="mt-0.5 size-4 shrink-0 text-muted-foreground" aria-hidden />
          <div className="text-sm text-muted-foreground">
            Распознано, но пока не переносится: {deferred.join(", ")}. Перенос этих сущностей ещё
            не поддерживается — они не потеряны и попадут в AutoCore, когда поддержка появится.
          </div>
        </div>
      ) : null}

      {result.failed.length > 0 ? (
        <div className="flex flex-col gap-1 rounded-xl border border-destructive/30 bg-destructive/[0.04] px-4 py-3">
          <span className="text-sm font-medium">Не удалось сохранить: {result.failed.length}</span>
          {result.failed.slice(0, 5).map((failure) => (
            <p key={failure.entityId} className="text-sm text-muted-foreground">
              {failure.message}
            </p>
          ))}
        </div>
      ) : null}

      <div className="flex flex-wrap items-center justify-center gap-2">
        {status === "partial" ? (
          <Button onClick={onResume} disabled={busy}>
            <RotateCcw data-icon="inline-start" className="size-4" />
            {busy ? "Продолжаем…" : "Продолжить импорт"}
          </Button>
        ) : null}
        <Button variant="outline" onClick={onOpenMotors}>
          Открыть двигатели
        </Button>
        <Button variant="outline" onClick={onOpenWarehouse}>
          Открыть склад
        </Button>
        <Button variant="ghost" onClick={onReset}>
          Импортировать ещё файл
        </Button>
      </div>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-xl border bg-card px-4 py-3 text-center">
      <div className="text-2xl font-semibold tabular-nums">{value}</div>
      <div className="text-sm text-muted-foreground">{label}</div>
    </div>
  );
}
