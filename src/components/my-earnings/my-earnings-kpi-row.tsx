"use client";

import { ClipboardList, PackageOpen, TrendingUp, Wallet } from "lucide-react";

import { McAnimatedValue } from "@/components/mission-control/animation";
import { KpiCard } from "@/components/ui/kpi-card";
import type { MyEarningsSummary } from "@/lib/my-earnings/compute-my-earnings";
import { userCopy } from "@/lib/user-copy";

type MyEarningsKpiRowProps = {
  summary: MyEarningsSummary;
};

export function MyEarningsKpiRow({ summary }: MyEarningsKpiRowProps) {
  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
      <KpiCard
        label={userCopy.myEarnings.kpi.avgPerOrder}
        value={summary.avgPerOrder}
        suffix=" ₸"
        icon={TrendingUp}
        tone="primary"
        variant="dashboard"
        footer={
          <span className="text-muted-foreground">
            по {summary.paidOrderCount} наряд{summary.paidOrderCount === 1 ? "у" : "ам"}
          </span>
        }
      />
      <KpiCard
        label={userCopy.myEarnings.kpi.closedMonth}
        value={summary.closedThisMonth}
        icon={ClipboardList}
        variant="dashboard"
      />
      <KpiCard
        label={userCopy.myEarnings.kpi.myOpen}
        value={summary.myOpen}
        icon={ClipboardList}
        tone="warning"
        variant="dashboard"
      />
      <KpiCard
        label={userCopy.myEarnings.kpi.freePool}
        value={summary.freePool}
        icon={PackageOpen}
        variant="dashboard"
        footer={
          summary.pending > 0 ? (
            <span className="inline-flex items-center gap-1 text-amber-600 dark:text-amber-400">
              <Wallet className="size-3" aria-hidden="true" />
              <McAnimatedValue value={summary.pending} format="currency" suffix=" ₸ к выплате" />
            </span>
          ) : undefined
        }
      />
    </div>
  );
}
