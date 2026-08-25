"use client";

import { AlertTriangle, ArrowRight, CheckCircle2, Info, Sparkles } from "lucide-react";

import type { PlanPresentation } from "@/lib/import/business/plan-summary";
import { cn } from "@/lib/utils";

/**
 * What AutoCore is about to do to your database.
 *
 * The screen this replaces asked a question nobody has: which column did the
 * import decide to put where, row after row after row. This answers the one
 * they actually have — how many donors, how many parts, what already exists,
 * what connects to what, and the short list of things that genuinely need a
 * person.
 *
 * Review is exception-based on purpose. A record appears below because
 * something about it is undecidable — a destructive merge, a conflict, a
 * number that could be a price or a quantity — not because its score fell
 * under a threshold. A confident record is not shown at all; that is the
 * point.
 */
export function PlanPreview({
  plan,
  onImport,
  busy,
  mergeDecisions,
  onDecideMerge,
  blockedByMerges,
}: {
  plan: PlanPresentation;
  onImport: () => void;
  busy?: boolean;
  /** The person's answers to proposed merges, by entity id. */
  mergeDecisions?: Record<string, "accept" | "reject">;
  onDecideMerge?: (entityId: string, answer: "accept" | "reject" | "clear") => void;
  /** Merges still unanswered. An unanswered merge is never performed. */
  blockedByMerges?: number;
}) {
  return (
    <div className="flex flex-col gap-6">
      <header className="flex flex-col gap-1">
        <div className="flex items-center gap-2">
          <Sparkles className="size-4 text-primary" aria-hidden />
          <h2 className="text-lg font-semibold tracking-tight">
            {plan.ai.used ? "AutoCore разобрал ваш бизнес" : "AutoCore разобрал файл"}
          </h2>
        </div>
        {plan.ai.degraded ? (
          <div className="flex flex-col gap-0.5">
            <p className="inline-flex items-center gap-1.5 text-sm text-amber-600 dark:text-amber-500">
              <AlertTriangle className="size-3.5" aria-hidden />
              ИИ-анализ недоступен — использован разбор по правилам
            </p>
            {plan.ai.reason ? (
              // The reason, verbatim. Without it "недоступен" is a dead end:
              // nobody can tell a missing key from a timeout, and the person
              // holding the file is often the only one who can fix it.
              <p className="pl-5 text-xs text-muted-foreground">{plan.ai.reason}</p>
            ) : null}
          </div>
        ) : null}
        {plan.ai.sheetSummaries.map((sheet) => (
          <p key={sheet.table} className="text-sm text-muted-foreground">
            <span className="font-medium text-foreground">{sheet.table}:</span> {sheet.summary}
          </p>
        ))}
      </header>

      <section className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
        {plan.headlines.map((line) => (
          <div key={line.kind} className="rounded-xl border bg-card px-4 py-3">
            <div className="flex items-baseline justify-between gap-2">
              <span className="text-sm text-muted-foreground">{line.label}</span>
              <span className="text-2xl font-semibold tabular-nums">{line.total}</span>
            </div>
            <div className="mt-1 flex flex-wrap gap-x-3 text-xs text-muted-foreground">
              {line.create > 0 ? <span>новых: {line.create}</span> : null}
              {line.update > 0 ? <span>обновится: {line.update}</span> : null}
              {line.review > 0 ? (
                <span className="text-amber-600 dark:text-amber-500">на проверку: {line.review}</span>
              ) : null}
            </div>
          </div>
        ))}
      </section>

      {plan.relationships.length > 0 ? (
        <section className="flex flex-col gap-1.5 rounded-xl border bg-card px-4 py-3">
          <h3 className="text-sm font-medium">Связи</h3>
          {plan.relationships.map((line) => (
            <p key={line.kind} className="inline-flex items-center gap-2 text-sm text-muted-foreground">
              <ArrowRight className="size-3.5 shrink-0" aria-hidden />
              <span className="tabular-nums font-medium text-foreground">{line.count}</span>
              {line.label}
            </p>
          ))}
        </section>
      ) : null}

      {plan.deferred.length > 0 ? (
        <section className="flex items-start gap-2 rounded-xl border border-border bg-muted/40 px-4 py-3">
          <Info className="mt-0.5 size-4 shrink-0 text-muted-foreground" aria-hidden />
          <div className="text-sm text-muted-foreground">
            Распознано, но пока не переносится:{" "}
            {plan.deferred.map((entry) => `${entry.label} (${entry.count})`).join(", ")}. Эти
            записи не потеряны — они видны в отчёте импорта.
          </div>
        </section>
      ) : null}

      {plan.ignoredRows > 0 ? (
        <p className="text-sm text-muted-foreground">
          Пропущено {plan.ignoredRows} служебных строк — итоги, заголовки разделов и заметки.
        </p>
      ) : null}

      {plan.reviewItems.length > 0 ? (
        <section className="flex flex-col gap-2">
          <h3 className="text-sm font-medium">
            Нужна проверка — {plan.reviewItems.length}
          </h3>
          {plan.reviewItems.slice(0, 20).map((item) => (
            <div
              key={item.entityId}
              className="flex flex-col gap-1 rounded-xl border border-amber-500/30 bg-amber-500/[0.04] px-4 py-3"
            >
              <div className="flex flex-wrap items-baseline justify-between gap-2">
                <span className="text-sm font-medium">{item.title}</span>
                <span className="text-xs text-muted-foreground tabular-nums">
                  уверенность {item.confidencePercent}%
                </span>
              </div>
              {item.reasons.map((reason, index) => (
                <p key={`${reason.code}-${index}`} className="text-sm text-muted-foreground">
                  {reason.message}
                </p>
              ))}
              {item.sources.length > 0 ? (
                <p className="text-xs text-muted-foreground">{item.sources.join(" · ")}</p>
              ) : null}
              {item.reasons.some((reason) => reason.code === "destructive-merge") &&
              onDecideMerge ? (
                <MergeChoice
                  entityId={item.entityId}
                  answer={mergeDecisions?.[item.entityId]}
                  onDecide={onDecideMerge}
                />
              ) : null}
            </div>
          ))}
        </section>
      ) : (
        <p className="inline-flex items-center gap-2 text-sm text-muted-foreground">
          <CheckCircle2 className="size-4 text-emerald-600 dark:text-emerald-500" aria-hidden />
          Неоднозначных записей нет — можно импортировать
        </p>
      )}

      {blockedByMerges && blockedByMerges > 0 ? (
        <p className="text-sm text-amber-600 dark:text-amber-500">
          Ответьте на {blockedByMerges}{" "}
          {blockedByMerges === 1 ? "предложение об объединении" : "предложения об объединении"} —
          объединение необратимо, поэтому без ответа оно не выполняется.
        </p>
      ) : null}

      <button
        type="button"
        disabled={busy}
        onClick={onImport}
        className={cn(
          "inline-flex h-11 items-center justify-center rounded-xl bg-primary px-5",
          "text-sm font-medium text-primary-foreground transition-opacity",
          busy && "opacity-60",
        )}
      >
        {busy
          ? "Импортируем…"
          : `Импортировать — ${plan.createTotal} новых, ${plan.updateTotal} обновится`}
      </button>
    </div>
  );
}

/**
 * The three answers to a proposed merge.
 *
 * "Оставить раздельно" is a real answer, not a way of postponing: it says the
 * records are genuinely different and both should exist. Leaving the question
 * alone is different again — nothing is merged, and the import says so rather
 * than quietly choosing for them.
 */
function MergeChoice({
  entityId,
  answer,
  onDecide,
}: {
  entityId: string;
  answer?: "accept" | "reject";
  onDecide: (entityId: string, answer: "accept" | "reject" | "clear") => void;
}) {
  const options: Array<{ value: "accept" | "reject"; label: string }> = [
    { value: "accept", label: "Объединить" },
    { value: "reject", label: "Оставить раздельно" },
  ];
  return (
    <div className="mt-1 flex items-center gap-0.5 self-start rounded-lg bg-muted p-0.5">
      {options.map((option) => (
        <button
          key={option.value}
          type="button"
          onClick={() => onDecide(entityId, answer === option.value ? "clear" : option.value)}
          className={cn(
            "rounded-md px-2 py-1 text-xs font-medium transition-colors",
            answer === option.value
              ? "bg-background text-foreground shadow-sm"
              : "text-muted-foreground hover:text-foreground",
          )}
        >
          {option.label}
        </button>
      ))}
    </div>
  );
}
