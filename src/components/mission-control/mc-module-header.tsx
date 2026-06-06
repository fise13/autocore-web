"use client";

import Link from "next/link";
import { ChevronRight, LucideIcon } from "lucide-react";

import { cn } from "@/lib/utils";

type McModuleHeaderProps = {
  icon: LucideIcon;
  title: string;
  description?: string;
  href?: string;
  accent?: "blue" | "green" | "amber" | "violet" | "default";
  trailing?: React.ReactNode;
};

const accentMap = {
  default: "mc-icon-badge",
  blue: "mc-icon-badge mc-icon-badge-blue",
  green: "mc-icon-badge mc-icon-badge-green",
  amber: "mc-icon-badge mc-icon-badge-amber",
  violet: "mc-icon-badge mc-icon-badge-violet",
};

export function McModuleHeader({
  icon: Icon,
  title,
  description,
  href,
  accent = "default",
  trailing,
}: McModuleHeaderProps) {
  return (
    <div className="mc-module-header">
      <div className="flex items-center justify-between gap-2">
        <div className="flex min-w-0 items-center gap-2.5">
          <div className={cn(accentMap[accent], "size-8 [&_svg]:size-3.5")}>
            <Icon className="size-3.5" />
          </div>
          <div className="min-w-0">
            <h3 className="truncate text-sm font-semibold tracking-tight">{title}</h3>
            {description ? (
              <p className="truncate text-xs text-muted-foreground">{description}</p>
            ) : null}
          </div>
        </div>
        <div className="flex shrink-0 items-center gap-2">
          {trailing}
          {href ? (
            <Link
              href={href}
              aria-label={`Открыть ${title}`}
              className="flex size-7 items-center justify-center rounded-lg border border-border/50 text-muted-foreground transition-colors hover:border-primary/25 hover:text-foreground"
            >
              <ChevronRight className="size-4" />
            </Link>
          ) : null}
        </div>
      </div>
    </div>
  );
}
