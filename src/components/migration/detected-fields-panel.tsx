"use client";

import { ArrowRight, ChevronDown, ListChecks } from "lucide-react";

import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { FIELD_SIGNATURE_BY_FIELD } from "@/lib/import";
import { cn } from "@/lib/utils";

import type { ReviewTableMapping } from "./migration-types";

const TIER_DOT = {
  high: "bg-emerald-500",
  medium: "bg-amber-500",
  low: "bg-destructive",
} as const;

export function DetectedFieldsPanel({ mappings }: { mappings: ReviewTableMapping[] }) {
  const totalFields = mappings.reduce((sum, mapping) => sum + mapping.fields.length, 0);

  return (
    <Collapsible className="rounded-xl border bg-card">
      <CollapsibleTrigger
        render={
          <button
            type="button"
            className="group flex w-full items-center justify-between gap-3 rounded-xl px-4 py-3 text-left transition-colors hover:bg-muted/50"
          />
        }
      >
        <span className="flex items-center gap-2.5">
          <ListChecks className="size-4 text-emerald-600" />
          <span className="text-sm font-medium">AutoCore сопоставил {totalFields} полей</span>
        </span>
        <span className="flex items-center gap-2 text-xs text-muted-foreground">
          Посмотреть соответствия
          <ChevronDown className="size-4 transition-transform group-data-[panel-open]:rotate-180" />
        </span>
      </CollapsibleTrigger>
      <CollapsibleContent>
        <div className="flex flex-col gap-5 border-t p-4">
          {mappings.map((mapping) => (
            <div key={mapping.id} className="flex flex-col gap-2">
              {mappings.length > 1 && (
                <span className="text-xs font-medium text-muted-foreground">{mapping.name}</span>
              )}
              <div className="grid gap-1.5">
                {mapping.fields.map((entry) => (
                  <div
                    key={`${mapping.id}-${entry.field}-${entry.header}`}
                    className="flex items-center gap-3 rounded-lg px-2 py-1.5 text-sm odd:bg-muted/30"
                  >
                    <span className="min-w-0 flex-1 truncate text-muted-foreground">{entry.header}</span>
                    <ArrowRight className="size-3.5 shrink-0 text-muted-foreground/60" />
                    <span className="min-w-0 flex-1 truncate font-medium">
                      {FIELD_SIGNATURE_BY_FIELD[entry.field]?.label ?? entry.field}
                    </span>
                    <span
                      className={cn("size-1.5 shrink-0 rounded-full", TIER_DOT[entry.confidence.tier])}
                      title={entry.confidence.reason}
                    />
                  </div>
                ))}
              </div>
              {mapping.unmappedHeaders.length > 0 && (
                <p className="text-xs text-muted-foreground">
                  Не сопоставлено: {mapping.unmappedHeaders.join(", ")}
                </p>
              )}
            </div>
          ))}
        </div>
      </CollapsibleContent>
    </Collapsible>
  );
}
