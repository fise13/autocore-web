"use client";

import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { motion, useReducedMotion } from "motion/react";

import { CoreAskButton, CoreLockup, CoreSurface } from "@/components/ai/core-surface";
import type { CompanyBriefing } from "@/domain/ai/company-brain";
import { mcEase } from "@/lib/motion/overview-motion";
import { userCopy } from "@/lib/user-copy";
import { cn } from "@/lib/utils";

export type CoreShiftView = {
  companyName?: string;
  compiledAt?: string;
  attention: CompanyBriefing["attention"];
  pulse: CompanyBriefing["pulse"];
  href?: string;
};

export function coreAttentionLine(item: CompanyBriefing["attention"][number]): string {
  const copy = userCopy.overview.coreBriefing.attention;
  if (item.id === "lowStock") return copy.lowStock(item.count ?? 0);
  if (item.id === "openWorkOrders") return copy.openWorkOrders(item.count ?? 0);
  if (item.id === "negativeNet") return copy.negativeNet;
  return copy.noEngines;
}

export function coreBriefingAge(compiledAt: string | undefined): string {
  const copy = userCopy.overview.coreBriefing;
  if (!compiledAt) return copy.onShift;
  const compiled = Date.parse(compiledAt);
  if (!Number.isFinite(compiled)) return copy.onShift;
  const delta = Date.now() - compiled;
  if (delta < 60_000) return copy.justNow;
  const minutes = Math.floor(delta / 60_000);
  if (minutes < 60) return copy.minutesAgo(minutes);
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return copy.hoursAgo(hours);
  return copy.onShift;
}

function ShiftMetrics({ pulse }: { pulse: CompanyBriefing["pulse"] }) {
  const copy = userCopy.overview.coreBriefing;
  if (pulse.length === 0) return null;

  return (
    <div className="grid grid-cols-2 overflow-hidden rounded-xl ring-1 ring-ai-border/80">
      {pulse.map((metric, index) => (
        <div
          key={metric.id}
          className={cn(
            "px-3 py-2.5",
            index % 2 === 1 && "border-l border-ai-border/70",
            index < 2 && pulse.length > 2 && "border-b border-ai-border/70",
            metric.tone === "attention" ? "bg-ai-subtle/50" : "bg-background/40",
          )}
        >
          <p className="text-[11px] leading-none text-muted-foreground">{copy.metrics[metric.id]}</p>
          <p
            className={cn(
              "mt-1.5 font-heading text-xl leading-none tabular-nums tracking-tight",
              metric.tone === "attention" ? "text-ai-on-subtle" : "text-foreground",
            )}
          >
            {metric.value}
          </p>
        </div>
      ))}
    </div>
  );
}

function ShiftBody({ view, density }: { view: CoreShiftView; density: "dashboard" | "chat" }) {
  const copy = userCopy.overview.coreBriefing;
  const [lead, ...rest] = view.attention;
  const headline = lead ? coreAttentionLine(lead) : copy.quiet;

  return (
    <div className="mt-4 grid gap-4 md:grid-cols-[minmax(0,1.35fr)_minmax(12.5rem,0.85fr)] md:items-end">
      <div className="min-w-0">
        <p
          className={cn(
            "font-heading text-pretty tracking-tight text-foreground",
            density === "dashboard" ? "text-[1.65rem] leading-[1.15] sm:text-[1.85rem]" : "text-xl leading-snug",
          )}
        >
          {headline}
        </p>
        {rest.length ? (
          <ul className="mt-3 space-y-1">
            {rest.map((item) => (
              <li key={`${item.id}-${item.count ?? 0}`} className="text-sm text-muted-foreground">
                {coreAttentionLine(item)}
              </li>
            ))}
          </ul>
        ) : null}
      </div>
      <ShiftMetrics pulse={view.pulse} />
    </div>
  );
}

export function CoreShiftSheet({
  state,
  view,
  density = "dashboard",
  onAsk,
  className,
}: {
  state: "loading" | "empty" | "ready";
  view?: CoreShiftView | null;
  density?: "dashboard" | "chat";
  onAsk?: () => void;
  className?: string;
}) {
  const copy = userCopy.overview.coreBriefing;
  const reduceMotion = useReducedMotion();
  const age = coreBriefingAge(view?.compiledAt);
  const status =
    state === "loading"
      ? copy.loading
      : state === "empty"
        ? copy.onShift
        : density === "chat" && view?.companyName
          ? `${view.companyName} · ${age}`
          : age;
  const action = onAsk ? (
    <CoreAskButton onClick={onAsk}>{copy.ask}</CoreAskButton>
  ) : view?.href && density === "chat" ? (
    <Link
      href={view.href}
      className="inline-flex h-8 cursor-pointer items-center gap-1 rounded-full px-2 text-[13px] text-muted-foreground transition-colors hover:text-foreground"
    >
      {copy.openHome}
      <ArrowRight className="size-3.5" aria-hidden />
    </Link>
  ) : null;

  const body =
    state === "loading" ? (
      <div className="mt-4 grid gap-4 md:grid-cols-[minmax(0,1.35fr)_minmax(12.5rem,0.85fr)]">
        <div className="h-10 max-w-sm rounded-md bg-ai-subtle motion-safe:animate-pulse" />
        <div className="grid grid-cols-2 gap-px overflow-hidden rounded-xl bg-ai-border/60">
          {Array.from({ length: 4 }, (_, index) => (
            <div key={index} className="h-[3.25rem] bg-ai-subtle/80 motion-safe:animate-pulse" />
          ))}
        </div>
      </div>
    ) : state === "empty" ? (
      <p className="mt-4 max-w-prose text-sm leading-relaxed text-muted-foreground">{copy.empty}</p>
    ) : view ? (
      <ShiftBody view={view} density={density} />
    ) : null;

  const sheet = (
    <CoreSurface compact={density === "chat"}>
      <CoreLockup status={status} action={action} orbSize={20} />
      {body}
    </CoreSurface>
  );

  const frameClass = cn(density === "dashboard" && "col-span-full", className);

  if (reduceMotion || density === "chat") {
    if (!frameClass) return sheet;
    return <div className={frameClass}>{sheet}</div>;
  }

  return (
    <motion.div
      className={frameClass}
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.42, ease: mcEase }}
    >
      {sheet}
    </motion.div>
  );
}
