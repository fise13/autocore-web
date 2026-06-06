"use client";

import type { LucideIcon } from "lucide-react";
import type { ReactNode } from "react";

import { cn } from "@/lib/utils";

/** Shared with AppSidebar links — keep edit mode visually identical. */
export const sidebarNavRowClass =
  "flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-sm transition-all duration-200";

export const sidebarNavIconClass = "size-4 shrink-0 opacity-80";

export const sidebarSectionLabelClass =
  "px-3 py-2 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground";

type SidebarNavRowProps = {
  icon: LucideIcon;
  label: string;
  hint?: string;
  active?: boolean;
  ghost?: boolean;
  className?: string;
  children?: ReactNode;
};

export function SidebarNavRow({
  icon: Icon,
  label,
  hint,
  active = false,
  ghost = false,
  className,
  children,
}: SidebarNavRowProps) {
  return (
    <div
      className={cn(
        sidebarNavRowClass,
        active
          ? "bg-primary/12 text-primary shadow-sm"
          : "text-sidebar-foreground hover:bg-sidebar-accent",
        ghost && "opacity-45 hover:opacity-70",
        className,
      )}
    >
      <Icon className={sidebarNavIconClass} />
      <span className="min-w-0 flex-1 truncate">{label}</span>
      {hint ? <span className="shrink-0 text-[10px] text-muted-foreground">{hint}</span> : null}
      {children}
    </div>
  );
}
