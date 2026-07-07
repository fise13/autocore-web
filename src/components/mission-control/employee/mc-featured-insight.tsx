"use client";

import Link from "next/link";
import { ArrowRight } from "lucide-react";

import {
  McPanel,
  McPanelBody,
} from "@/components/mission-control/dashboard/dashboard-panel";
import type { EmployeeInsight } from "@/lib/mission-control/compute-employee-dashboard";
import { userCopy } from "@/lib/user-copy";
import { cn } from "@/lib/utils";

type McFeaturedInsightProps = {
  insight: EmployeeInsight | null;
  className?: string;
};

const toneClass: Record<NonNullable<EmployeeInsight>["tone"], string> = {
  neutral: "border-border bg-muted/30",
  positive: "border-emerald-500/25 bg-emerald-500/5",
  warning: "border-amber-500/25 bg-amber-500/5",
};

export function McFeaturedInsight({ insight, className }: McFeaturedInsightProps) {
  const content = insight ?? {
    id: "fallback",
    title: userCopy.missionControl.employee.insightFallback,
    detail: "",
    cta: "Заказ-наряды",
    href: "/work-orders",
    tone: "neutral" as const,
  };

  return (
    <McPanel className={cn("shadow-none dark:ring-0", className, toneClass[content.tone])}>
      <McPanelBody className="flex flex-col gap-3">
        <div>
          <p className="text-sm font-semibold">{content.title}</p>
          {content.detail ? (
            <p className="mt-1 text-sm text-muted-foreground">{content.detail}</p>
          ) : null}
        </div>
        <Link
          href={content.href}
          className="inline-flex items-center gap-1 text-sm font-medium text-primary hover:underline"
        >
          {content.cta}
          <ArrowRight className="size-3.5" aria-hidden="true" />
        </Link>
      </McPanelBody>
    </McPanel>
  );
}
