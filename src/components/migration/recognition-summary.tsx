"use client";

import { motion } from "framer-motion";
import {
  ArrowRight,
  CheckCircle2,
  Clock,
  Copy,
  HelpCircle,
  Images,
  Sparkles,
  TriangleAlert,
} from "lucide-react";

import { AnimatedNumber } from "@/components/ui/animated-number";
import { Button } from "@/components/ui/button";

import type { RecognitionSummary } from "./migration-types";
import { recordTypeIcon } from "./record-type-meta";

function formatEta(seconds: number): string {
  if (seconds < 60) return `≈ ${seconds} сек`;
  const minutes = Math.round(seconds / 60);
  return `≈ ${minutes} мин`;
}

export function RecognitionSummaryView({
  summary,
  fileNames,
  onContinue,
}: {
  summary: RecognitionSummary;
  fileNames: string[];
  onContinue: () => void;
}) {
  const cards = [
    ...summary.byType.map((item) => ({
      key: item.type as string,
      Icon: recordTypeIcon(item.type),
      count: item.count,
      label: item.label,
    })),
    ...(summary.unknown > 0
      ? [{ key: "unknown", Icon: HelpCircle, count: summary.unknown, label: "Без категории" }]
      : []),
    ...(summary.photos > 0
      ? [{ key: "photos", Icon: Images, count: summary.photos, label: "Фотографий" }]
      : []),
  ];

  const source =
    fileNames.length > 1 ? `${fileNames.length} файла` : fileNames[0] ?? "ваш файл";

  return (
    <div className="mx-auto flex w-full max-w-3xl flex-col gap-7 px-6 py-12">
      <div className="flex flex-col gap-2 text-center">
        <span className="mx-auto inline-flex items-center gap-1.5 rounded-full bg-emerald-500/10 px-3 py-1 text-xs font-medium text-emerald-700 dark:text-emerald-300">
          <Sparkles className="size-3.5" />
          AutoCore разобрал {source}
        </span>
        <h2 className="font-heading text-2xl font-semibold tracking-tight md:text-3xl">
          Вот что мы нашли в вашем бизнесе
        </h2>
      </div>

      {/* Confidence summary — derived from the same rows as the cards below. */}
      <div className="flex flex-col gap-4 rounded-2xl border bg-card p-5">
        <div className="flex items-baseline gap-2">
          <AnimatedNumber
            value={summary.totalRows}
            className="font-heading text-3xl font-semibold tabular-nums"
          />
          <span className="text-sm text-muted-foreground">строк найдено</span>
        </div>
        <div className="grid gap-2 sm:grid-cols-3">
          <ConfidenceStat
            tone="emerald"
            Icon={CheckCircle2}
            value={summary.recognized}
            label="распознано автоматически"
          />
          <ConfidenceStat
            tone="amber"
            Icon={TriangleAlert}
            value={summary.needsReview}
            label="требуют проверки"
          />
          <ConfidenceStat
            tone="sky"
            Icon={Copy}
            value={summary.duplicates}
            label="возможных дублей"
          />
        </div>
      </div>

      {cards.length > 0 && (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
          {cards.map((card, index) => (
            <motion.div
              key={card.key}
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.04, duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
              className="flex flex-col gap-2 rounded-xl border bg-card p-4"
            >
              <span className="flex size-9 items-center justify-center rounded-lg bg-emerald-500/10 text-emerald-600">
                <card.Icon className="size-4.5" />
              </span>
              <AnimatedNumber
                value={card.count}
                className="font-heading text-2xl font-semibold tabular-nums"
              />
              <span className="text-sm text-muted-foreground">{card.label}</span>
            </motion.div>
          ))}
        </div>
      )}

      <div className="flex flex-col gap-4 rounded-xl border bg-muted/40 p-4 sm:flex-row sm:items-center sm:justify-between">
        <span className="flex items-center gap-1.5 text-sm">
          <Clock className="size-4 text-muted-foreground" />
          Примерное время переноса{" "}
          <strong className="font-medium">{formatEta(summary.etaSeconds)}</strong>
        </span>
        <Button size="lg" onClick={onContinue} className="shrink-0">
          Проверить и перенести
          <ArrowRight data-icon="inline-end" />
        </Button>
      </div>
    </div>
  );
}

function ConfidenceStat({
  tone,
  Icon,
  value,
  label,
}: {
  tone: "emerald" | "amber" | "sky";
  Icon: typeof CheckCircle2;
  value: number;
  label: string;
}) {
  const toneClass =
    tone === "emerald"
      ? "text-emerald-600"
      : tone === "amber"
        ? "text-amber-600"
        : "text-sky-600";
  return (
    <div className="flex items-start gap-2.5 rounded-lg bg-muted/40 px-3 py-2.5">
      <Icon className={`mt-0.5 size-4 shrink-0 ${toneClass}`} />
      <div className="flex flex-col">
        <AnimatedNumber
          value={value}
          className="font-heading text-base font-semibold tabular-nums"
        />
        <span className="text-xs leading-snug text-muted-foreground">{label}</span>
      </div>
    </div>
  );
}
