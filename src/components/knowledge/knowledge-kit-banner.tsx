"use client";

import type { KnowledgeSuggestion } from "@/domain/knowledge/types";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { userCopy } from "@/lib/user-copy";

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
        <p className="text-grid font-medium">
          {userCopy.knowledge.kitFor(engineCode)}
          <span className="ml-1.5 text-micro font-normal text-muted-foreground">
            {userCopy.knowledge.positionsConfidence(items.length, Math.round(confidence * 100))}
          </span>
        </p>
        <p className="truncate text-micro text-muted-foreground">
          {items[0]?.explanation ?? userCopy.knowledge.kitFallback}
        </p>
      </div>
      <div className="flex items-center gap-1.5">
        {onDismiss ? (
          <Button type="button" variant="ghost" size="sm" onClick={onDismiss}>
            {userCopy.knowledge.hide}
          </Button>
        ) : null}
        <Button type="button" size="sm" onClick={() => onApply(items)}>
          {userCopy.knowledge.add}
        </Button>
      </div>
    </div>
  );
}
