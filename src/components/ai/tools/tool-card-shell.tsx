"use client";

import Link from "next/link";
import { ArrowRight } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import type { ReactNode } from "react";

import { userCopy } from "@/lib/user-copy";
import { cn } from "@/lib/utils";

/**
 * Shared frame for every Core tool result.
 *
 * One frame keeps generative UI reading as one product rather than a pile of
 * bespoke cards, and it is where the old `objectCard` / `metric` / `timeline`
 * block vocabulary now lives as a real surface.
 *
 * Sized from `--container-chat` down to 320px: the header wraps, the count
 * badge never pushes the title out, and the footer link is a full-width touch
 * target under `sm`.
 */
export function ToolCardShell({
  icon: Icon,
  title,
  meta,
  href,
  footerLabel,
  notice,
  empty,
  children,
  className,
}: {
  icon: LucideIcon;
  title: string;
  /** Short right-aligned counter, e.g. "12 matches". */
  meta?: string;
  href?: string;
  footerLabel?: string;
  /** Honest caveat — partial window, row-level scope limit. */
  notice?: string;
  empty?: boolean;
  children?: ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "w-full overflow-hidden rounded-xl border border-border bg-card",
        "text-card-foreground shadow-none",
        className,
      )}
    >
      <div className="flex flex-wrap items-center gap-x-2 gap-y-1 border-b border-border/70 px-3 py-2">
        <Icon className="size-3.5 shrink-0 text-muted-foreground" aria-hidden />
        <span className="min-w-0 flex-1 truncate text-[13px] font-medium leading-none">
          {title}
        </span>
        {meta ? (
          <span className="shrink-0 rounded-md bg-muted px-1.5 py-0.5 text-[11px] leading-none tabular-nums text-muted-foreground">
            {meta}
          </span>
        ) : null}
      </div>

      {empty ? (
        <p className="px-3 py-4 text-center text-[13px] text-muted-foreground">
          {userCopy.ai.tool.empty}
        </p>
      ) : (
        children
      )}

      {notice ? (
        <p className="border-t border-border/70 px-3 py-1.5 text-[11px] leading-snug text-muted-foreground">
          {notice}
        </p>
      ) : null}

      {href ? (
        <Link
          href={href}
          className={cn(
            "flex min-h-11 items-center justify-between gap-2 border-t border-border/70 px-3",
            "text-[13px] font-medium transition-colors hover:bg-muted sm:min-h-9",
          )}
        >
          {footerLabel ?? userCopy.ai.tool.openInAutocore}
          <ArrowRight className="size-3.5 shrink-0 opacity-60" aria-hidden />
        </Link>
      ) : null}
    </div>
  );
}

/** Row inside a card. `href` turns it into a tappable link with a chevron. */
export function ToolCardRow({
  href,
  children,
  className,
}: {
  href?: string;
  children: ReactNode;
  className?: string;
}) {
  const body = (
    <div
      className={cn(
        "flex min-h-11 items-center gap-3 px-3 py-2 sm:min-h-0",
        href && "transition-colors hover:bg-muted",
        className,
      )}
    >
      {children}
      {href ? (
        <ArrowRight className="size-3.5 shrink-0 text-muted-foreground opacity-60" aria-hidden />
      ) : null}
    </div>
  );

  if (!href) return body;
  return (
    <Link href={href} className="block border-b border-border/50 last:border-b-0">
      {body}
    </Link>
  );
}

/** Two-line label/value stack used inside rows — truncates instead of wrapping. */
export function ToolCardLines({
  title,
  subtitle,
}: {
  title: string;
  subtitle?: string;
}) {
  return (
    <span className="min-w-0 flex-1">
      <span className="block truncate text-[13px] font-medium leading-tight">{title}</span>
      {subtitle ? (
        <span className="block truncate text-[11px] leading-tight text-muted-foreground">
          {subtitle}
        </span>
      ) : null}
    </span>
  );
}
