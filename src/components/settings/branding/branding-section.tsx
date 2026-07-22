"use client";

import { ReactNode } from "react";
import type { LucideIcon } from "lucide-react";
import { motion } from "motion/react";

import { cn } from "@/lib/utils";

type BrandingSectionProps = {
  icon: LucideIcon;
  title: string;
  description?: string;
  children: ReactNode;
  className?: string;
};

const sectionMotion = {
  hidden: { opacity: 0, y: 10 },
  show: {
    opacity: 1,
    y: 0,
    transition: { type: "spring" as const, stiffness: 380, damping: 32 },
  },
};

export function BrandingSection({ icon: Icon, title, description, children, className }: BrandingSectionProps) {
  return (
    <motion.section
      variants={sectionMotion}
      className={cn("border-t border-border/50 pt-5 first:border-t-0 first:pt-0", className)}
    >
      <div className="mb-4 flex items-start gap-3">
        <span className="inline-flex size-9 shrink-0 items-center justify-center rounded-xl bg-muted/50 text-primary">
          <Icon className="size-4" />
        </span>
        <div className="min-w-0">
          <h3 className="text-sm font-semibold tracking-tight">{title}</h3>
          {description ? (
            <p className="mt-1 text-xs leading-relaxed text-muted-foreground">{description}</p>
          ) : null}
        </div>
      </div>
      {children}
    </motion.section>
  );
}
