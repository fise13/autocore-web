"use client";

import { ReactNode } from "react";

import { cn } from "@/lib/utils";

type AnimatedTabsPanelProps = {
  active: boolean;
  epoch: number;
  children: ReactNode;
  className?: string;
};

export function AnimatedTabsPanel({ active, epoch, children, className }: AnimatedTabsPanelProps) {
  if (!active) return null;

  return (
    <div key={epoch} className={cn("animate-autocore-tab-enter outline-none", className)}>
      {children}
    </div>
  );
}
