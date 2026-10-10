"use client";

import { ArrowRight, Check } from "lucide-react";
import type { ButtonHTMLAttributes, ReactNode } from "react";

import { ThinkingOrb } from "@/components/ai/thinking-orb";
import { userCopy } from "@/lib/user-copy";
import { cn } from "@/lib/utils";

export function CoreSurface({
  className,
  compact = false,
  children,
}: {
  className?: string;
  compact?: boolean;
  children: ReactNode;
}) {
  return (
    <section className={cn("core-shift-sheet", className)}>
      <div
        className={cn(
          "core-shift-sheet__inner",
          compact ? "px-3.5 py-3.5" : "px-4 py-4 sm:px-5 sm:py-5",
        )}
      >
        {children}
      </div>
    </section>
  );
}

export function CoreLockup({
  name = userCopy.overview.coreBriefing.title,
  status,
  action,
  orbSize = 20,
}: {
  name?: string;
  status: string;
  action?: ReactNode;
  orbSize?: number;
}) {
  return (
    <div className="flex items-start justify-between gap-3">
      <div className="flex min-w-0 items-center gap-2.5">
        <ThinkingOrb size={orbSize} state="idle" decorative />
        <div className="min-w-0">
          <p className="font-heading text-sm font-medium leading-none">{name}</p>
          <p className="mt-1 truncate text-micro leading-none text-muted-foreground">{status}</p>
        </div>
      </div>
      {action}
    </div>
  );
}

export function CoreAskButton({
  children,
  className,
  type = "button",
  mark = "go",
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & { mark?: "go" | "confirm" }) {
  const Mark = mark === "confirm" ? Check : ArrowRight;
  return (
    <button
      {...props}
      type={type}
      className={cn(
        "core-liquid-glass-btn group inline-flex h-9 shrink-0 cursor-pointer items-center gap-2 rounded-full pl-3.5 pr-1",
        "text-sm font-medium text-foreground",
        "transition-[transform,opacity] duration-200 ease-[cubic-bezier(0.22,1,0.36,1)]",
        "hover:opacity-90 active:scale-[0.98]",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ai/50",
        "disabled:pointer-events-none disabled:opacity-50",
        className,
      )}
    >
      <span className="whitespace-nowrap">{children}</span>
      <span className="flex size-7 items-center justify-center rounded-full bg-ai text-ai-foreground">
        <Mark
          className={cn(
            "size-3.5",
            mark === "go" && "transition-transform duration-200 ease-out group-hover:translate-x-0.5",
          )}
          aria-hidden
        />
      </span>
    </button>
  );
}
