"use client";

import Link from "next/link";
import { motion, useReducedMotion } from "framer-motion";
import type { LucideIcon } from "lucide-react";
import { ChevronRightIcon } from "lucide-react";

import { cn } from "@/lib/utils";

type EnterpriseQuickLinkProps = {
  icon: LucideIcon;
  label: string;
  hint?: string;
  href?: string;
  onClick?: () => void;
};

export function EnterpriseQuickLink({
  icon: Icon,
  label,
  hint,
  href,
  onClick,
}: EnterpriseQuickLinkProps) {
  const reduceMotion = useReducedMotion();
  const className = cn(
    "group flex w-full cursor-pointer items-center gap-3 rounded-xl border border-transparent px-3 py-3 text-left",
    "transition-[border-color,background-color,transform] duration-200 ease-out",
    "hover:border-border/60 hover:bg-muted/40 motion-reduce:transition-none",
  );

  const content = (
    <>
      <span className="flex size-10 shrink-0 items-center justify-center rounded-xl border bg-background shadow-sm transition-[border-color,box-shadow] duration-200 group-hover:border-primary/20 group-hover:shadow-md">
        <Icon className="size-4 text-muted-foreground transition-colors duration-200 group-hover:text-foreground" />
      </span>
      <span className="min-w-0 flex-1">
        <span className="block text-sm font-medium">{label}</span>
        {hint ? <span className="mt-0.5 block text-xs text-muted-foreground">{hint}</span> : null}
      </span>
      <ChevronRightIcon className="size-4 shrink-0 text-muted-foreground transition-[opacity,transform] duration-200 group-hover:translate-x-0.5 group-hover:opacity-100 md:opacity-40" />
    </>
  );

  if (href) {
    return (
      <motion.div whileHover={reduceMotion ? undefined : { x: 2 }} transition={{ duration: 0.18 }}>
        <Link href={href} className={className}>
          {content}
        </Link>
      </motion.div>
    );
  }

  return (
    <motion.button
      type="button"
      onClick={onClick}
      className={className}
      whileHover={reduceMotion ? undefined : { x: 2 }}
      transition={{ duration: 0.18 }}
    >
      {content}
    </motion.button>
  );
}
