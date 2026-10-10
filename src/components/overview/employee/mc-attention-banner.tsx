"use client";

import Link from "next/link";
import { AlertTriangle, Sparkles } from "lucide-react";

import type { EmployeeAttentionItem } from "@/lib/overview/compute-employee-dashboard";
import { userCopy } from "@/lib/user-copy";
import { cn } from "@/lib/utils";

type McAttentionBannerProps = {
  items: EmployeeAttentionItem[];
};

const toneClass: Record<EmployeeAttentionItem["tone"], string> = {
  warning: "border-warning-border bg-warning-subtle text-warning-on-subtle",
  danger: "border-destructive/30 bg-destructive/10 text-destructive",
  positive: "border-success-border bg-success-subtle text-success-on-subtle",
};

export function McAttentionBanner({ items }: McAttentionBannerProps) {
  if (items.length === 0) return null;

  return (
    <div className="col-span-full rounded-xl border bg-card/60 p-4">
      <p className="mb-3 flex items-center gap-2 text-sm font-medium">
        <AlertTriangle className="size-4 text-warning-on-subtle" aria-hidden="true" />
        {userCopy.overview.employee.attentionTitle}
      </p>
      <div className="flex flex-wrap gap-2">
        {items.map((item) => (
          <Link
            key={item.id}
            href={item.href}
            className={cn(
              "inline-flex items-center gap-2 rounded-lg border px-3 py-2 text-sm transition-opacity hover:opacity-90",
              toneClass[item.tone],
            )}
          >
            <span className="font-semibold tabular-nums">{item.count}</span>
            <span>{item.text}</span>
            {item.tone === "positive" ? (
              <Sparkles className="size-3.5 opacity-70" aria-hidden="true" />
            ) : null}
          </Link>
        ))}
      </div>
    </div>
  );
}
