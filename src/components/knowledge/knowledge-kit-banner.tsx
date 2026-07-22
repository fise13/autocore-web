"use client";

import type { KnowledgeSuggestion } from "@/domain/knowledge/types";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

type KnowledgeKitBannerProps = {
  engineCode: string;
  items: KnowledgeSuggestion[];
  confidence: number;
  onApply: (items: KnowledgeSuggestion[]) => void;
  onDismiss?: () => void;
  className?: string;
};

export function KnowledgeKitBanner({
  engineCode,
  items,
  confidence,
  onApply,
  onDismiss,
  className,
}: KnowledgeKitBannerProps) {
  if (items.length === 0) return null;

  return (
    <div
      className={cn(
        "flex flex-wrap items-center justify-between gap-2 rounded-md border border-border/80 bg-muted/30 px-3 py-2",
        className,
      )}
    >
      <div className="min-w-0">
        <p className="text-[13px] font-medium">
          Комплект для {engineCode}
          <span className="ml-1.5 text-[11px] font-normal text-muted-foreground">
            {items.length} поз. · {Math.round(confidence * 100)}%
          </span>
        </p>
        <p className="truncate text-[11px] text-muted-foreground">
          {items[0]?.explanation ?? "На основе завершённых заказ-нарядов компании"}
        </p>
      </div>
      <div className="flex items-center gap-1.5">
        {onDismiss ? (
          <Button type="button" variant="ghost" size="sm" onClick={onDismiss}>
            Скрыть
          </Button>
        ) : null}
        <Button type="button" size="sm" onClick={() => onApply(items)}>
          Добавить
        </Button>
      </div>
    </div>
  );
}
