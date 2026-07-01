"use client";

import { useMemo, useRef, useState } from "react";
import { useVirtualizer } from "@tanstack/react-virtual";
import {
  CheckCircle2,
  CheckSquare,
  MoreHorizontal,
  RotateCcw,
  Square,
  Trash2,
  TriangleAlert,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";
import type { ImageAsset, RecordSuggestion } from "@/lib/import";

import { ConfidencePill } from "./confidence-pill";
import type { ReviewRow } from "./migration-types";
import { PHOTO_DRAG_TYPE } from "./photo-drag";
import { PhotoThumb } from "./photo-thumb";
import { RecordTypePicker } from "./record-type-picker";

const GRID =
  "grid grid-cols-[2.25rem_170px_minmax(0,1.5fr)_minmax(0,1.7fr)_5.5rem_2.75rem_2.25rem] items-center gap-2";

type Filter = "all" | "attention";

export type ReviewGridProps = {
  rows: ReviewRow[];
  selection: Set<string>;
  onToggleSelect: (id: string) => void;
  onSelectAll: (ids: string[]) => void;
  onClearSelection: () => void;
  onSetRowType: (id: string, type: ReviewRow["recordType"]) => void;
  onApplySuggestion: (id: string, suggestion: RecordSuggestion) => void;
  onSetRowValue: (id: string, field: "name", value: string) => void;
  onAttachPhotoPath: (id: string, path: string) => void;
  onSkip: (ids: string[]) => void;
  onRestore: (ids: string[]) => void;
  onDelete: (ids: string[]) => void;
  onAcceptAllSuggestions: () => void;
};

export function ReviewGrid(props: ReviewGridProps) {
  const { rows, selection } = props;
  const [filter, setFilter] = useState<Filter>("all");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [draft, setDraft] = useState("");
  const [dragOverId, setDragOverId] = useState<string | null>(null);

  const parentRef = useRef<HTMLDivElement>(null);

  const visibleRows = useMemo(
    () => (filter === "attention" ? rows.filter((row) => row.confidence.tier !== "high") : rows),
    [rows, filter],
  );

  const virtualizer = useVirtualizer({
    count: visibleRows.length,
    getScrollElement: () => parentRef.current,
    estimateSize: () => 52,
    overscan: 12,
    measureElement: (el) => el.getBoundingClientRect().height,
  });

  const attentionCount = useMemo(
    () => rows.filter((row) => row.confidence.tier !== "high").length,
    [rows],
  );
  const suggestionCount = useMemo(
    () => rows.filter((row) => row.suggestions.length > 0).length,
    [rows],
  );

  const visibleIds = visibleRows.map((row) => row.id);
  const allSelected = visibleIds.length > 0 && visibleIds.every((id) => selection.has(id));
  const selectedArray = [...selection];

  return (
    <div className="flex flex-col overflow-hidden rounded-xl border bg-card">
      {/* Toolbar */}
      <div className="flex flex-wrap items-center justify-between gap-2 border-b px-3 py-2">
        <div className="flex items-center gap-1 rounded-lg bg-muted p-0.5 text-sm">
          <FilterTab active={filter === "all"} onClick={() => setFilter("all")}>
            Все {rows.length}
          </FilterTab>
          <FilterTab active={filter === "attention"} onClick={() => setFilter("attention")}>
            Требуют внимания {attentionCount}
          </FilterTab>
        </div>
        {suggestionCount > 0 && (
          <Button variant="outline" size="sm" onClick={props.onAcceptAllSuggestions}>
            <CheckCircle2 data-icon="inline-start" />
            Принять все предложения ({suggestionCount})
          </Button>
        )}
      </div>

      {/* Header */}
      <div className={cn(GRID, "border-b bg-muted/40 px-3 py-2 text-xs font-medium text-muted-foreground")}>
        <button
          type="button"
          aria-label="Выбрать все"
          onClick={() => (allSelected ? props.onClearSelection() : props.onSelectAll(visibleIds))}
          className="flex items-center justify-center text-muted-foreground hover:text-foreground"
        >
          {allSelected ? <CheckSquare className="size-4 text-emerald-600" /> : <Square className="size-4" />}
        </button>
        <span>Тип</span>
        <span>Позиция</span>
        <span>Что заметил AutoCore</span>
        <span className="text-right">Уверенность</span>
        <span className="text-center">Фото</span>
        <span />
      </div>

      {/* Virtualized rows */}
      <div ref={parentRef} className="max-h-[min(58vh,640px)] overflow-y-auto">
        <div style={{ height: virtualizer.getTotalSize(), position: "relative" }}>
          {virtualizer.getVirtualItems().map((virtualRow) => {
            const row = visibleRows[virtualRow.index];
            const skipped = row.status === "skipped";
            const isEditing = editingId === row.id;
            return (
              <div
                key={row.id}
                data-index={virtualRow.index}
                ref={virtualizer.measureElement}
                style={{ position: "absolute", top: 0, left: 0, width: "100%", transform: `translateY(${virtualRow.start}px)` }}
                onDragOver={(event) => {
                  if (event.dataTransfer.types.includes(PHOTO_DRAG_TYPE)) {
                    event.preventDefault();
                    setDragOverId(row.id);
                  }
                }}
                onDragLeave={() => setDragOverId((current) => (current === row.id ? null : current))}
                onDrop={(event) => {
                  const path = event.dataTransfer.getData(PHOTO_DRAG_TYPE);
                  setDragOverId(null);
                  if (path) {
                    event.preventDefault();
                    props.onAttachPhotoPath(row.id, path);
                  }
                }}
                className={cn(
                  GRID,
                  "border-b px-3 py-2 text-sm transition-colors",
                  selection.has(row.id) ? "bg-emerald-500/[0.06]" : "hover:bg-muted/40",
                  dragOverId === row.id && "ring-2 ring-inset ring-emerald-500",
                  skipped && "opacity-45",
                )}
              >
                {/* Select */}
                <button
                  type="button"
                  aria-label="Выбрать строку"
                  onClick={() => props.onToggleSelect(row.id)}
                  className="flex items-center justify-center text-muted-foreground hover:text-foreground"
                >
                  {selection.has(row.id) ? (
                    <CheckSquare className="size-4 text-emerald-600" />
                  ) : (
                    <Square className="size-4" />
                  )}
                </button>

                {/* Type */}
                <RecordTypePicker value={row.recordType} onChange={(type) => props.onSetRowType(row.id, type)} />

                {/* Name + source */}
                <div className="flex min-w-0 flex-col">
                  {isEditing ? (
                    <input
                      autoFocus
                      value={draft}
                      onChange={(event) => setDraft(event.target.value)}
                      onBlur={() => {
                        props.onSetRowValue(row.id, "name", draft.trim());
                        setEditingId(null);
                      }}
                      onKeyDown={(event) => {
                        if (event.key === "Enter") {
                          props.onSetRowValue(row.id, "name", draft.trim());
                          setEditingId(null);
                        } else if (event.key === "Escape") {
                          setEditingId(null);
                        }
                      }}
                      className="w-full rounded-md border border-emerald-500 bg-background px-1.5 py-0.5 text-sm outline-none"
                    />
                  ) : (
                    <button
                      type="button"
                      onClick={() => {
                        setDraft(row.values.name ?? "");
                        setEditingId(row.id);
                      }}
                      className={cn(
                        "truncate rounded-md px-1 py-0.5 text-left hover:bg-muted",
                        skipped && "line-through",
                        !row.values.name && "text-muted-foreground italic",
                      )}
                    >
                      {row.values.name || "Без названия"}
                    </button>
                  )}
                  <span className="truncate px-1 text-xs text-muted-foreground">
                    {[row.values.serial || row.values.sku || row.values.vin, row.source]
                      .filter(Boolean)
                      .join(" · ")}
                  </span>
                </div>

                {/* Attention: suggestions or issues */}
                <AttentionCell row={row} onApply={(s) => props.onApplySuggestion(row.id, s)} />

                {/* Confidence */}
                <div className="flex justify-end">
                  <ConfidencePill explanation={row.explanation} />
                </div>

                {/* Photo */}
                <div className="flex items-center justify-center">
                  {row.photo ? (
                    <PhotoThumb asset={row.photo} className="size-7 ring-1 ring-border" />
                  ) : (
                    <span className="flex size-7 items-center justify-center rounded-md border border-dashed text-[10px] text-muted-foreground/60">
                      +
                    </span>
                  )}
                </div>

                {/* Actions */}
                <DropdownMenu>
                  <DropdownMenuTrigger
                    render={<Button variant="ghost" size="icon-sm" aria-label="Действия со строкой" />}
                  >
                    <MoreHorizontal />
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="w-44">
                    {skipped ? (
                      <DropdownMenuItem onClick={() => props.onRestore([row.id])}>
                        <RotateCcw />
                        Вернуть в импорт
                      </DropdownMenuItem>
                    ) : (
                      <DropdownMenuItem onClick={() => props.onSkip([row.id])}>
                        <TriangleAlert />
                        Пропустить строку
                      </DropdownMenuItem>
                    )}
                    <DropdownMenuSeparator />
                    <DropdownMenuItem variant="destructive" onClick={() => props.onDelete([row.id])}>
                      <Trash2 />
                      Удалить
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            );
          })}
        </div>
      </div>

      {/* Batch toolbar */}
      {selection.size > 0 && (
        <div className="flex flex-wrap items-center justify-between gap-2 border-t bg-muted/60 px-3 py-2 text-sm">
          <span className="font-medium">Выбрано: {selection.size}</span>
          <div className="flex items-center gap-1.5">
            <Button variant="ghost" size="sm" onClick={() => props.onSkip(selectedArray)}>
              Пропустить
            </Button>
            <Button variant="ghost" size="sm" onClick={() => props.onRestore(selectedArray)}>
              Вернуть
            </Button>
            <Button variant="ghost" size="sm" onClick={() => props.onDelete(selectedArray)}>
              <Trash2 data-icon="inline-start" />
              Удалить
            </Button>
            <Button variant="outline" size="sm" onClick={props.onClearSelection}>
              Снять выделение
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}

function FilterTab({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "rounded-md px-2.5 py-1 text-xs font-medium transition-colors",
        active ? "bg-background text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground",
      )}
    >
      {children}
    </button>
  );
}

function AttentionCell({
  row,
  onApply,
}: {
  row: ReviewRow;
  onApply: (suggestion: RecordSuggestion) => void;
}) {
  if (row.suggestions.length > 0) {
    return (
      <div className="flex min-w-0 flex-wrap gap-1">
        {row.suggestions.map((suggestion) => (
          <button
            key={`${suggestion.recordType}:${suggestion.value}`}
            type="button"
            onClick={() => onApply(suggestion)}
            className="inline-flex items-center gap-1 rounded-md border border-emerald-500/40 bg-emerald-500/5 px-1.5 py-0.5 text-xs text-emerald-700 transition-colors hover:bg-emerald-500/15 dark:text-emerald-300"
          >
            <span className="max-w-32 truncate">{suggestion.value}</span>
            <span className="tabular-nums opacity-70">{Math.round(suggestion.confidence * 100)}%</span>
          </button>
        ))}
      </div>
    );
  }

  const warnings = row.explanation.reasons.filter((reason) => reason.tone === "warning");
  if (warnings.length > 0) {
    return (
      <span className="flex min-w-0 items-center gap-1.5 text-xs text-muted-foreground">
        <TriangleAlert className="size-3 shrink-0 text-amber-500" />
        <span className="truncate">{warnings.map((reason) => reason.label).join(" · ")}</span>
      </span>
    );
  }

  return (
    <span className="flex items-center gap-1.5 text-xs text-muted-foreground">
      <CheckCircle2 className="size-3 shrink-0 text-emerald-500" />
      Готово к переносу
    </span>
  );
}
