"use client";

import { useEffect, useRef } from "react";
import { useVirtualizer } from "@tanstack/react-virtual";
import { CornerDownLeft, Plus } from "lucide-react";
import { userCopy } from "@/lib/user-copy";

import { domainIconFor } from "@/components/domain/domain-icon";
import type { DomainCategory, DomainEntry, DomainSearchResult } from "@/lib/domain/types";
import { cn } from "@/lib/utils";

const ROW_HEIGHT = 44;
const ROW_HEIGHT_COMPACT = 36;
const VIRTUALIZE_THRESHOLD = 40;

export type DomainSuggestionListProps = {
  category: DomainCategory;
  results: DomainSearchResult[];
  /** Highlighted index spanning results then (optionally) the create row. */
  activeIndex: number;
  onActiveIndexChange: (index: number) => void;
  onSelect: (entry: DomainEntry) => void;
  showCreate?: boolean;
  createLabel?: string;
  onCreate?: () => void;
  emptyLabel?: string;
  className?: string;
  highlightQuery?: string;
  compact?: boolean;
};

/**
 * Presentational, fully-virtualized suggestion list shared by every surface
 * (standalone input and the Excel grid editor). Keyboard state is owned by the
 * parent; this component only renders and reports hover.
 */
export function DomainSuggestionList({
  category,
  results,
  activeIndex,
  onActiveIndexChange,
  onSelect,
  showCreate = false,
  createLabel,
  onCreate,
  emptyLabel = userCopy.domain.empty,
  className,
  highlightQuery = "",
  compact = false,
}: DomainSuggestionListProps) {
  const rowHeight = compact ? ROW_HEIGHT_COMPACT : ROW_HEIGHT;
  const scrollRef = useRef<HTMLDivElement>(null);
  const virtualizer = useVirtualizer({
    count: results.length,
    getScrollElement: () => scrollRef.current,
    estimateSize: () => rowHeight,
    overscan: 8,
  });

  const virtualize = results.length > VIRTUALIZE_THRESHOLD;

  useEffect(() => {
    if (virtualize && activeIndex >= 0 && activeIndex < results.length) {
      virtualizer.scrollToIndex(activeIndex, { align: "auto" });
    }
  }, [activeIndex, results.length, virtualize, virtualizer]);

  const hasResults = results.length > 0;

  return (
    <div className={cn("flex max-h-[280px] flex-col overflow-hidden", className)}>
      <div
        ref={scrollRef}
        className="min-h-0 flex-1 overflow-y-auto overscroll-contain p-1"
        role="listbox"
      >
        {!hasResults && !showCreate ? (
          <div className="px-3 py-6 text-center text-grid text-muted-foreground">{emptyLabel}</div>
        ) : null}

        {virtualize ? (
          <div style={{ height: virtualizer.getTotalSize(), position: "relative", width: "100%" }}>
            {virtualizer.getVirtualItems().map((item) => {
              const result = results[item.index];
              return (
                <div
                  key={result.entry.id}
                  style={{
                    position: "absolute",
                    top: 0,
                    left: 0,
                    width: "100%",
                    height: item.size,
                    transform: `translateY(${item.start}px)`,
                  }}
                >
                  <SuggestionRow
                    category={category}
                    entry={result.entry}
                    active={item.index === activeIndex}
                    compact={compact}
                    highlightQuery={highlightQuery}
                    onHover={() => onActiveIndexChange(item.index)}
                    onSelect={() => onSelect(result.entry)}
                  />
                </div>
              );
            })}
          </div>
        ) : (
          results.map((result, index) => (
            <SuggestionRow
              key={result.entry.id}
              category={category}
              entry={result.entry}
              active={index === activeIndex}
              compact={compact}
              highlightQuery={highlightQuery}
              onHover={() => onActiveIndexChange(index)}
              onSelect={() => onSelect(result.entry)}
            />
          ))
        )}
      </div>

      {showCreate ? (
        <button
          type="button"
          onMouseDown={(event) => {
            event.preventDefault();
            onCreate?.();
          }}
          onMouseEnter={() => onActiveIndexChange(results.length)}
          className={cn(
            "flex shrink-0 items-center gap-2 border-t border-border/60 px-3 py-2.5 text-left text-grid transition-colors",
            activeIndex === results.length
              ? "bg-primary/10 text-foreground"
              : "text-muted-foreground hover:bg-muted/60",
          )}
        >
          <span className="flex size-5 items-center justify-center rounded-[5px] bg-primary/15 text-primary">
            <Plus className="size-3.5" />
          </span>
          <span className="min-w-0 flex-1 truncate">
            {createLabel ?? userCopy.domain.createNew}
          </span>
          <CornerDownLeft className="size-3.5 opacity-50" />
        </button>
      ) : null}
    </div>
  );
}

type SuggestionRowProps = {
  category: DomainCategory;
  entry: DomainEntry;
  active: boolean;
  compact?: boolean;
  highlightQuery?: string;
  onHover: () => void;
  onSelect: () => void;
};

function SuggestionRow({
  category,
  entry,
  active,
  compact = false,
  highlightQuery = "",
  onHover,
  onSelect,
}: SuggestionRowProps) {
  const Icon = domainIconFor(category, entry);
  const secondary = entry.brand ?? entry.category;
  const meta = [secondary, entry.hint].filter(Boolean).join(" · ");

  return (
    <button
      type="button"
      role="option"
      aria-selected={active}
      onMouseDown={(event) => {
        event.preventDefault();
        onSelect();
      }}
      onMouseMove={onHover}
      className={cn(
        "flex w-full items-center gap-2.5 rounded-[6px] px-2.5 text-left transition-colors",
        compact ? "min-h-9 py-1" : "min-h-[44px] py-1.5",
        active
          ? "bg-primary text-primary-foreground"
          : "text-foreground hover:bg-muted/70",
      )}
    >
      {!compact ? (
        <span
          className={cn(
            "flex size-7 shrink-0 items-center justify-center rounded-[6px] border",
            active
              ? "border-primary-foreground/20 bg-primary-foreground/15"
              : "border-border/70 bg-muted/50",
          )}
        >
          <Icon
            className={cn(
              "size-3.5",
              active ? "text-primary-foreground" : "text-foreground/70",
            )}
          />
        </span>
      ) : null}
      <span className="flex min-w-0 flex-1 flex-col gap-0.5">
        <span className="flex items-center gap-1.5">
          <span
            className={cn(
              "truncate text-grid font-semibold tracking-tight",
              active ? "text-primary-foreground" : "text-foreground",
            )}
          >
            {entry.name}
          </span>
          {entry.custom ? (
            <span
              className={cn(
                "rounded-[4px] px-1 py-px text-micro font-semibold uppercase tracking-wide",
                active
                  ? "bg-primary-foreground/20 text-primary-foreground"
                  : "bg-primary/12 text-primary",
              )}
            >
              {userCopy.domain.mine}
            </span>
          ) : null}
        </span>
        {meta && !compact ? (
          <span
            className={cn(
              "truncate text-xs leading-tight",
              active ? "text-primary-foreground/85" : "text-foreground/65",
            )}
          >
            {meta}
          </span>
        ) : null}
      </span>
    </button>
  );
}
