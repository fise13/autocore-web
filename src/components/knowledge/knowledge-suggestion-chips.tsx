"use client";

import { XIcon } from "lucide-react";

import type { KnowledgeSuggestion } from "@/domain/knowledge/types";
import { cn } from "@/lib/utils";

type KnowledgeSuggestionChipsProps = {
  suggestions: KnowledgeSuggestion[];
  onAccept: (suggestion: KnowledgeSuggestion) => void;
  onDismiss?: (suggestion: KnowledgeSuggestion) => void;
  className?: string;
  emptyLabel?: string;
};

function formatConfidence(value: number): string {
  return `${Math.round(value * 100)}%`;
}

export function KnowledgeSuggestionChips({
  suggestions,
  onAccept,
  onDismiss,
  className,
  emptyLabel,
}: KnowledgeSuggestionChipsProps) {
  if (suggestions.length === 0) {
    if (!emptyLabel) return null;
    return <p className="text-[11px] text-muted-foreground">{emptyLabel}</p>;
  }

  return (
    <div className={cn("flex flex-wrap gap-1.5", className)}>
      {suggestions.map((suggestion) => (
        <div
          key={suggestion.id}
          className="group inline-flex max-w-full items-center gap-1 rounded-md border border-border/70 bg-muted/40 px-1.5 py-0.5 text-[12px]"
          title={suggestion.explanation}
        >
          <button
            type="button"
            className="truncate text-left hover:text-foreground"
            onClick={() => onAccept(suggestion)}
          >
            <span className="font-medium">{suggestion.title}</span>
            <span className="ml-1 text-[10px] text-muted-foreground">
              {formatConfidence(suggestion.confidence)}
            </span>
          </button>
          {onDismiss ? (
            <button
              type="button"
              aria-label="Отклонить"
              className="rounded p-0.5 text-muted-foreground opacity-60 hover:bg-background hover:opacity-100"
              onClick={() => onDismiss(suggestion)}
            >
              <XIcon className="size-3" />
            </button>
          ) : null}
        </div>
      ))}
    </div>
  );
}
