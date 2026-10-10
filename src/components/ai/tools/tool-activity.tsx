"use client";

import { CircleAlert } from "lucide-react";
import type { LucideIcon } from "lucide-react";

import { Shimmer } from "@/components/ai-elements/shimmer";
import type { CoreToolName } from "@/domain/ai/tool-schemas";
import { userCopy } from "@/lib/user-copy";
import { cn } from "@/lib/utils";
import { TOOL_ICONS } from "@/components/ai/tools/tool-icons";

/**
 * Live tool activity — the honest replacement for the old "Thinking…" panel.
 *
 * The previous UI showed a fabricated three-phase timer driven by
 * `setTimeout`, so it claimed the model was reasoning whether or not it was.
 * This renders only what is actually happening: a tool the model really
 * called, named by what it reads.
 */
export function ToolActivity({
  tool,
  detail,
  className,
}: {
  tool: CoreToolName | "generic";
  /** Short argument echo, e.g. the search term. Hidden under `sm`. */
  detail?: string;
  className?: string;
}) {
  const Icon: LucideIcon = TOOL_ICONS[tool];
  const label =
    tool === "generic" ? userCopy.ai.tool.generic : userCopy.ai.tool[tool];

  return (
    <div
      className={cn("core-status", className)}
      role="status"
      aria-live="polite"
    >
      <Icon className="size-3.5 shrink-0" aria-hidden />
      <Shimmer as="span" className="shrink-0" duration={1.4}>
        {label}
      </Shimmer>
      {detail ? (
        <span className="hidden min-w-0 truncate sm:inline">
          {detail}
        </span>
      ) : null}
    </div>
  );
}

/**
 * A tool step that failed. Shows the reason the executor returned — never a
 * stack trace, and never the raw provider error.
 */
export function ToolError({ reason, className }: { reason?: string; className?: string }) {
  return (
    <div
      className={cn(
        "flex w-full items-start gap-2 rounded-xl border border-border bg-muted/30 px-3 py-2",
        className,
      )}
    >
      <CircleAlert className="mt-0.5 size-3.5 shrink-0 text-muted-foreground" aria-hidden />
      <p className="min-w-0 text-grid leading-snug text-muted-foreground">
        {reason?.trim() || userCopy.ai.tool.failed}
      </p>
    </div>
  );
}

/**
 * Pre-first-token indicator: three dots, no word attached.
 *
 * Deliberately wordless — the model has not done anything yet, so claiming it
 * is "thinking" would be the same fabrication this work removed.
 */
export function PendingDots({ className }: { className?: string }) {
  return (
    <span
      className={cn("inline-flex items-center gap-1 py-1", className)}
      role="status"
      aria-label={userCopy.ai.tool.generic}
    >
      {[0, 1, 2].map((index) => (
        <span
          key={index}
          className="size-1.5 animate-pulse rounded-full bg-muted-foreground/50"
          style={{ animationDelay: `${index * 160}ms`, animationDuration: "1.1s" }}
        />
      ))}
    </span>
  );
}
