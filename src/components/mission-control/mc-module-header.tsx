"use client";

import Link from "next/link";
import { LucideIcon } from "lucide-react";

import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";

type McModuleHeaderProps = {
  icon: LucideIcon;
  title: string;
  description: string;
  href?: string;
  hrefLabel?: string;
  accent?: "blue" | "green" | "amber" | "violet" | "default";
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
  hrefLabel = "Открыть",
  accent = "default",
}: McModuleHeaderProps) {
  return (
    <div className="mc-module-header">
      <div className="flex items-start justify-between gap-3">
        <div className="flex min-w-0 items-start gap-3">
          <div className={cn(accentMap[accent])}>
            <Icon className="size-4" />
          </div>
          <div className="min-w-0 space-y-0.5">
            <h3 className="text-base font-semibold tracking-tight">{title}</h3>
            <p className="text-sm text-muted-foreground">{description}</p>
          </div>
        </div>
        {href ? (
          <Link
            href={href}
            className={buttonVariants({
              variant: "ghost",
              size: "sm",
              className: "h-8 shrink-0 text-xs text-muted-foreground hover:text-foreground",
            })}
          >
            {hrefLabel}
          </Link>
        ) : null}
      </div>
    </div>
  );
}
