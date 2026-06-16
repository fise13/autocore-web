"use client";

import Link from "next/link";
import { LayoutGroup, motion, useReducedMotion } from "framer-motion";
import type { LucideIcon } from "lucide-react";

import { cn } from "@/lib/utils";

const navSpring = { type: "spring" as const, stiffness: 420, damping: 34, mass: 0.85 };

export type EnterpriseWorkspaceNavItem = {
  id: string;
  label: string;
  icon: LucideIcon;
  href?: string;
};

type EnterpriseWorkspaceNavProps = {
  layoutId: string;
  items: EnterpriseWorkspaceNavItem[];
  activeId: string;
  onSelect: (id: string) => void;
  className?: string;
};

export function EnterpriseWorkspaceNav({
  layoutId,
  items,
  activeId,
  onSelect,
  className,
}: EnterpriseWorkspaceNavProps) {
  const reduceMotion = useReducedMotion();

  return (
    <LayoutGroup id={layoutId}>
      <nav
        className={cn(
          "flex flex-wrap gap-1 rounded-xl border bg-card/80 p-1.5 shadow-sm backdrop-blur-sm",
          className,
        )}
      >
        {items.map((item) => {
          const active = activeId === item.id;
          const Icon = item.icon;
          const rowClassName = cn(
            "relative inline-flex cursor-pointer items-center gap-2 rounded-lg px-3 py-2 text-sm transition-colors duration-200",
            active
              ? "text-primary"
              : "text-muted-foreground hover:bg-muted/60 hover:text-foreground",
          );

          const content = (
            <>
              {active && !reduceMotion ? (
                <motion.span
                  layoutId={`${layoutId}-active`}
                  className="absolute inset-0 rounded-lg bg-primary/10 shadow-sm"
                  transition={navSpring}
                />
              ) : active ? (
                <span className="absolute inset-0 rounded-lg bg-primary/10 shadow-sm" />
              ) : null}
              <span className="relative z-10 flex items-center gap-2">
                <Icon className="size-4 shrink-0" />
                <span className="whitespace-nowrap">{item.label}</span>
              </span>
            </>
          );

          if (item.href) {
            return (
              <Link key={item.id} href={item.href} className={rowClassName}>
                {content}
              </Link>
            );
          }

          return (
            <button key={item.id} type="button" className={rowClassName} onClick={() => onSelect(item.id)}>
              {content}
            </button>
          );
        })}
      </nav>
    </LayoutGroup>
  );
}
