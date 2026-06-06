"use client";

import Link from "next/link";
import type { LucideIcon } from "lucide-react";
import { Plus, Search } from "lucide-react";

import { cn } from "@/lib/utils";

type WorkOrdersPrimaryActionProps = {
  href: string;
  label: string;
  className?: string;
  compact?: boolean;
};

export function WorkOrdersPrimaryAction({
  href,
  label,
  className,
  compact = false,
}: WorkOrdersPrimaryActionProps) {
  return (
    <Link
      href={href}
      className={cn(
        "inline-flex shrink-0 items-center justify-center gap-2 rounded-lg bg-primary font-medium text-primary-foreground shadow-sm transition-colors hover:bg-primary/90",
        compact ? "h-9 px-3 text-sm" : "min-h-10 w-full px-3 py-2.5 text-sm",
        className,
      )}
    >
      <Plus className="size-4 shrink-0" />
      <span className={compact ? "whitespace-nowrap" : "min-w-0 text-left leading-snug"}>{label}</span>
    </Link>
  );
}

type WorkOrdersDirectoryCardProps = {
  icon: LucideIcon;
  title: string;
  subtitle?: string;
  meta?: string[];
  actionHref?: string;
  actionLabel?: string;
};

export function WorkOrdersDirectoryCard({
  icon: Icon,
  title,
  subtitle,
  meta = [],
  actionHref,
  actionLabel = "Новый заказ",
}: WorkOrdersDirectoryCardProps) {
  return (
    <article className="group flex items-center gap-3 rounded-xl border bg-card p-3.5 transition hover:border-primary/15 hover:shadow-sm sm:gap-4 sm:p-4">
      <div className="flex size-10 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary sm:size-11">
        <Icon className="size-4 sm:size-[18px]" />
      </div>

      <div className="min-w-0 flex-1">
        <h3 className="truncate text-sm font-semibold tracking-tight sm:text-[15px]">{title}</h3>
        {subtitle ? <p className="mt-0.5 truncate text-sm text-muted-foreground">{subtitle}</p> : null}
        {meta.length > 0 ? (
          <div className="mt-1.5 flex flex-wrap gap-x-2 gap-y-0.5 text-xs text-muted-foreground">
            {meta.map((line) => (
              <span key={line} className="truncate">
                {line}
              </span>
            ))}
          </div>
        ) : null}
      </div>

      {actionHref ? (
        <WorkOrdersPrimaryAction href={actionHref} label={actionLabel} compact className="hidden sm:inline-flex" />
      ) : null}
      {actionHref ? (
        <Link
          href={actionHref}
          title={actionLabel}
          aria-label={actionLabel}
          className="inline-flex size-9 shrink-0 items-center justify-center rounded-lg border border-primary/20 bg-primary/5 text-primary transition hover:bg-primary hover:text-primary-foreground sm:hidden"
        >
          <Plus className="size-4" />
        </Link>
      ) : null}
    </article>
  );
}

type WorkOrdersPanelHeaderProps = {
  title: string;
  description: string;
  search: string;
  onSearchChange: (value: string) => void;
  searchPlaceholder: string;
  actionHref?: string;
  actionLabel?: string;
};

export function WorkOrdersPanelHeader({
  title,
  description,
  search,
  onSearchChange,
  searchPlaceholder,
  actionHref,
  actionLabel,
}: WorkOrdersPanelHeaderProps) {
  return (
    <div className="shrink-0 space-y-3 border-b bg-card/80 p-4 backdrop-blur-sm md:px-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <h2 className="text-base font-semibold tracking-tight">{title}</h2>
          <p className="mt-0.5 text-xs text-muted-foreground">{description}</p>
        </div>
        {actionHref && actionLabel ? (
          <WorkOrdersPrimaryAction href={actionHref} label={actionLabel} compact className="hidden md:inline-flex" />
        ) : null}
      </div>
      <div className="relative max-w-xl">
        <Search className="pointer-events-none absolute top-1/2 left-3 size-3.5 -translate-y-1/2 text-muted-foreground" />
        <input
          type="search"
          value={search}
          onChange={(event) => onSearchChange(event.target.value)}
          placeholder={searchPlaceholder}
          className="h-10 w-full rounded-lg border border-input bg-background pr-3 pl-9 text-sm shadow-xs outline-none transition placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
        />
      </div>
    </div>
  );
}

function vehicleCountLabel(count: number): string {
  if (count === 0) return "Авто не привязаны";
  if (count === 1) return "1 автомобиль";
  if (count < 5) return `${count} автомобиля`;
  return `${count} автомобилей`;
}

export { vehicleCountLabel };
