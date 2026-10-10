"use client";

import { McAnimatedValue } from "@/components/overview/animation";
import { Delta, DeltaIcon, DeltaValue } from "@/components/ui/delta";
import type { MyEarningsSummary } from "@/lib/my-earnings/compute-my-earnings";
import { userCopy } from "@/lib/user-copy";
import { cn } from "@/lib/utils";

type MyEarningsHeroProps = {
  summary: MyEarningsSummary;
  className?: string;
};

export function MyEarningsHero({ summary, className }: MyEarningsHeroProps) {
  return (
    <div
      className={cn(
        "grid gap-4 rounded-xl border bg-gradient-to-br from-card via-card to-primary/5 p-5 md:grid-cols-2 md:p-6",
        className,
      )}
    >
      <div>
        <p className="text-sm text-muted-foreground">{userCopy.myEarnings.heroPaid}</p>
        <p className="mt-1 text-3xl font-semibold tracking-tight tabular-nums md:text-4xl">
          <McAnimatedValue value={summary.paid} format="currency" />
        </p>
        {summary.growthPercent !== null ? (
          <div className="mt-2 flex items-center gap-1 text-xs">
            <Delta value={summary.growthPercent}>
              <DeltaIcon />
              <DeltaValue suffix="%" />
            </Delta>
            <span className="text-muted-foreground">{userCopy.myEarnings.vsLastWeek}</span>
          </div>
        ) : null}
      </div>
      <div className="rounded-lg border border-warning-border bg-warning-subtle p-4">
        <p className="text-sm text-muted-foreground">{userCopy.myEarnings.heroPending}</p>
        <p className="mt-1 text-2xl font-semibold tabular-nums text-warning-on-subtle">
          <McAnimatedValue value={summary.pending} format="currency" />
        </p>
      </div>
    </div>
  );
}
