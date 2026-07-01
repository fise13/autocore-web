"use client";

import { ReactNode } from "react";

import { SIDEBAR_COLLAPSED_WIDTH, SIDEBAR_MIN_WIDTH } from "@/hooks/use-sidebar-layout";
import type { SidebarPosition } from "@/lib/navigation/sidebar-customization";
import { cn } from "@/lib/utils";

type ResizableSidebarProps = {
  children: ReactNode;
  collapsed: boolean;
  width: number;
  position?: SidebarPosition;
  isEditing?: boolean;
  onWidthChange?: (width: number) => void;
};

export function ResizableSidebar({
  children,
  collapsed,
  width,
  position = "left",
  isEditing = false,
}: ResizableSidebarProps) {
  const clampedWidth = Math.max(width, SIDEBAR_MIN_WIDTH);
  const effectiveWidth = collapsed ? SIDEBAR_COLLAPSED_WIDTH : clampedWidth;

  return (
    <aside
      data-collapsed={collapsed ? "true" : "false"}
      data-editing={isEditing ? "true" : undefined}
      className={cn(
        "app-sidebar-shell relative hidden h-full shrink-0 overflow-hidden md:flex md:flex-col",
        "motion-reduce:transition-none",
        position === "right" ? "border-l border-sidebar-border" : "border-r border-sidebar-border",
      )}
      style={{ width: effectiveWidth }}
    >
      <div className="flex h-full flex-col bg-sidebar motion-reduce:transition-none" style={{ width: effectiveWidth }}>
        {children}
      </div>
    </aside>
  );
}
