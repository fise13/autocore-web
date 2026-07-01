"use client";

import { Check, TriangleAlert } from "lucide-react";

import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";

import type { RowExplanation } from "@/lib/import";

const TIER_STYLES = {
  high: "bg-emerald-500/12 text-emerald-700 dark:text-emerald-300",
  medium: "bg-amber-500/15 text-amber-700 dark:text-amber-300",
  low: "bg-destructive/10 text-destructive",
} as const;

const TIER_DOT = {
  high: "bg-emerald-500",
  medium: "bg-amber-500",
  low: "bg-destructive",
} as const;

/** A reason bullet line (positive checkmark or amber warning). */
export function ConfidenceReasons({ explanation }: { explanation: RowExplanation }) {
  if (explanation.reasons.length === 0) {
    return <p className="text-xs text-muted-foreground">Подтверждено автоматически</p>;
  }
  return (
    <ul className="flex flex-col gap-1">
      {explanation.reasons.map((reason, index) => (
        <li key={index} className="flex items-start gap-1.5 text-xs leading-snug">
          {reason.tone === "positive" ? (
            <Check className="mt-0.5 size-3 shrink-0 text-emerald-600" />
          ) : (
            <TriangleAlert className="mt-0.5 size-3 shrink-0 text-amber-600" />
          )}
          <span className={cn(reason.tone === "warning" ? "text-foreground" : "text-muted-foreground")}>
            {reason.label}
          </span>
        </li>
      ))}
    </ul>
  );
}

/** The percent pill with a hover explanation. Confidence is never just a number. */
export function ConfidencePill({
  explanation,
  className,
}: {
  explanation: RowExplanation;
  className?: string;
}) {
  return (
    <Tooltip>
      <TooltipTrigger
        render={
          <button
            type="button"
            className={cn(
              "inline-flex items-center gap-1.5 rounded-full px-2 py-0.5 text-xs font-semibold tabular-nums transition-colors",
              TIER_STYLES[explanation.tier],
              className,
            )}
          />
        }
      >
        <span className={cn("size-1.5 rounded-full", TIER_DOT[explanation.tier])} />
        {explanation.percent}%
      </TooltipTrigger>
      <TooltipContent side="left" className="max-w-64 bg-popover p-2.5 text-popover-foreground ring-1 ring-foreground/10">
        <ConfidenceReasons explanation={explanation} />
      </TooltipContent>
    </Tooltip>
  );
}
