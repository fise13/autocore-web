"use client";

import { memo } from "react";
import { AlertTriangle, BarChart3, Clock, Package, TrendingUp } from "lucide-react";

import { AnimatedNumber } from "@/components/ui/animated-number";
import { McModuleHeader } from "@/components/mission-control/mc-module-header";
import { InventoryAnalytics } from "@/lib/mission-control/compute-inventory-analytics";
import { userCopy } from "@/lib/user-copy";
import { cn } from "@/lib/utils";

const copy = userCopy.missionControl.analytics;

type InventoryAnalyticsModuleProps = {
  analytics: InventoryAnalytics;
  isLoading: boolean;
};

export const InventoryAnalyticsModule = memo(function InventoryAnalyticsModule({
  analytics,
  isLoading,
}: InventoryAnalyticsModuleProps) {
  const hasSales = analytics.motorSaleCount > 0;
  const staleTone =
    analytics.staleMotorCount > 0 ? "text-amber-500 dark:text-amber-400" : "text-emerald-500 dark:text-emerald-400";

  return (
    <article className="mc-module-card">
      <McModuleHeader icon={BarChart3} title={copy.title} href="/motors" accent="green" />
      <div className="mc-module-body space-y-3.5">
        {isLoading ? (
          <AnalyticsSkeleton />
        ) : (
          <>
            <RevenueHero analytics={analytics} />

            <div className="grid grid-cols-2 gap-2.5">
              <MetricTile
                icon={Clock}
                label={copy.avgDaysLabel}
                value={analytics.avgDaysToSale != null ? `${analytics.avgDaysToSale} дн.` : "—"}
                hint={
                  analytics.soldCount > 0
                    ? copy.avgDaysHintSold(analytics.soldCount)
                    : copy.avgDaysHintEmpty
                }
                tone="text-blue-500 dark:text-blue-400"
              />
              <MetricTile
                icon={AlertTriangle}
                label={copy.staleLabel}
                value={String(analytics.staleMotorCount)}
                hint={copy.staleHint}
                tone={staleTone}
              />
            </div>

            <InventoryHealthBar
              available={analytics.availableCount}
              stale={analytics.staleMotorCount}
              staleShare={analytics.staleShare}
            />

            <div className="grid gap-3 md:grid-cols-2">
              <RankPanel
                title={copy.topBrands}
                empty={copy.topBrandsEmpty}
                items={analytics.topBrands.map((item) => ({ label: item.name, count: item.count }))}
                accentClass="bg-chart-2"
              />
              <RankPanel
                title={copy.topEngines}
                empty={copy.topEnginesEmpty}
                items={analytics.topEngines.map((item) => ({ label: item.code, count: item.count }))}
                accentClass="bg-chart-3"
              />
            </div>

            {!hasSales ? (
              <p className="rounded-lg border border-dashed border-border/60 bg-muted/15 px-3 py-2 text-xs text-muted-foreground">
                {copy.noSalesYet}
              </p>
            ) : null}
          </>
        )}
      </div>
    </article>
  );
});

function AnalyticsSkeleton() {
  return (
    <div className="space-y-3">
      <div className="h-[4.5rem] animate-pulse rounded-xl bg-muted/50" />
      <div className="grid grid-cols-2 gap-2.5">
        <div className="h-20 animate-pulse rounded-xl bg-muted/50" />
        <div className="h-20 animate-pulse rounded-xl bg-muted/50" />
      </div>
      <div className="h-12 animate-pulse rounded-xl bg-muted/50" />
      <div className="grid gap-3 md:grid-cols-2">
        <div className="h-28 animate-pulse rounded-xl bg-muted/50" />
        <div className="h-28 animate-pulse rounded-xl bg-muted/50" />
      </div>
    </div>
  );
}

function RevenueHero({ analytics }: { analytics: InventoryAnalytics }) {
  const hasRevenue = analytics.motorSaleRevenue > 0;

  return (
    <div
      className={cn(
        "relative overflow-hidden rounded-xl border p-3.5",
        hasRevenue
          ? "border-emerald-500/20 bg-gradient-to-br from-emerald-500/10 via-background/40 to-background/20"
          : "border-border/50 bg-background/30",
      )}
    >
      {hasRevenue ? (
        <div
          className="pointer-events-none absolute -top-8 -right-8 size-24 rounded-full bg-emerald-500/10 blur-2xl"
          aria-hidden
        />
      ) : null}

      <div className="relative flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
            <TrendingUp className="size-3.5 text-emerald-500" aria-hidden />
            <span>{copy.revenueLabel}</span>
          </div>
          <p className="mt-1 text-2xl font-semibold tabular-nums tracking-tight text-emerald-600 dark:text-emerald-400">
            {hasRevenue ? (
              <AnimatedNumber
                value={analytics.motorSaleRevenue}
                format={(value) => `${value.toLocaleString("ru-RU")} ₸`}
              />
            ) : (
              "—"
            )}
          </p>
        </div>

        <div className="shrink-0 text-right">
          <p className="text-[10px] font-semibold uppercase tracking-[0.08em] text-muted-foreground">
            {copy.salesCount}
          </p>
          <p className="mt-0.5 text-lg font-semibold tabular-nums">{analytics.motorSaleCount}</p>
          {analytics.motorSaleAvgAmount > 0 ? (
            <p className="mt-0.5 text-[11px] tabular-nums text-muted-foreground">
              {copy.avgCheckPrefix} {analytics.motorSaleAvgAmount.toLocaleString("ru-RU")} ₸
            </p>
          ) : null}
        </div>
      </div>
    </div>
  );
}

function MetricTile({
  icon: Icon,
  label,
  value,
  hint,
  tone,
}: {
  icon: typeof Clock;
  label: string;
  value: string;
  hint: string;
  tone: string;
}) {
  return (
    <div className="mc-stat-chip flex flex-col justify-between gap-1">
      <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
        <Icon className={cn("size-3.5", tone)} aria-hidden />
        <span className="leading-tight">{label}</span>
      </div>
      <p className={cn("text-xl font-semibold tabular-nums tracking-tight", tone)}>{value}</p>
      <p className="text-[10px] leading-snug text-muted-foreground">{hint}</p>
    </div>
  );
}

function InventoryHealthBar({
  available,
  stale,
  staleShare,
}: {
  available: number;
  stale: number;
  staleShare: number;
}) {
  const fresh = Math.max(0, available - stale);
  const hasStock = available > 0;
  const freshShare = hasStock ? 100 - staleShare : 0;

  return (
    <div className="rounded-xl border border-border/40 bg-background/30 p-3">
      <div className="mb-2.5 flex items-center justify-between gap-2">
        <div className="flex items-center gap-1.5">
          <Package className="size-3.5 text-muted-foreground" aria-hidden />
          <p className="mc-section-label">{copy.inventoryComposition}</p>
        </div>
        <span className="text-xs tabular-nums text-muted-foreground">{copy.pieces(available)}</span>
      </div>

      {hasStock ? (
        <>
          <div className="flex h-2.5 overflow-hidden rounded-full bg-muted/80">
            <div
              className="h-full bg-emerald-500/75 transition-all duration-500"
              style={{ width: `${freshShare}%` }}
              title={`${copy.inStock}: ${fresh}`}
            />
            <div
              className={cn(
                "h-full transition-all duration-500",
                stale > 0 ? "bg-amber-500/80" : "bg-transparent",
              )}
              style={{ width: `${staleShare}%` }}
              title={`${copy.staleShort}: ${stale}`}
            />
          </div>

          <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-[11px] text-muted-foreground">
            <span className="inline-flex items-center gap-1.5">
              <span className="size-2 rounded-full bg-emerald-500/75" aria-hidden />
              {copy.inStock} · {fresh}
            </span>
            <span className="inline-flex items-center gap-1.5">
              <span className="size-2 rounded-full bg-amber-500/80" aria-hidden />
              {copy.staleShort} · {stale}
              {` (${staleShare}%)`}
            </span>
          </div>
        </>
      ) : (
        <p className="text-xs text-muted-foreground">{copy.inventoryEmpty}</p>
      )}
    </div>
  );
}

function RankPanel({
  title,
  empty,
  items,
  accentClass,
}: {
  title: string;
  empty: string;
  items: { label: string; count: number }[];
  accentClass: string;
}) {
  const max = Math.max(1, ...items.map((item) => item.count));

  return (
    <div className="space-y-2">
      <p className="mc-section-label">{title}</p>
      {items.length === 0 ? (
        <p className="rounded-lg border border-dashed border-border/50 px-3 py-4 text-center text-xs text-muted-foreground">
          {empty}
        </p>
      ) : (
        <div className="space-y-1.5">
          {items.map((item, index) => (
            <div key={item.label} className="mc-list-row flex items-center gap-2.5 py-2">
              <span className="flex size-6 shrink-0 items-center justify-center rounded-md bg-muted text-[10px] font-semibold tabular-nums text-muted-foreground">
                {index + 1}
              </span>
              <div className="min-w-0 flex-1">
                <div className="flex items-center justify-between gap-2">
                  <p className="truncate text-sm font-medium">{item.label}</p>
                  <span className="shrink-0 rounded-full bg-primary/10 px-2 py-0.5 text-[11px] font-medium tabular-nums text-primary">
                    {item.count}
                  </span>
                </div>
                <div className="mt-1.5 h-1 overflow-hidden rounded-full bg-muted/80">
                  <div
                    className={cn("h-full rounded-full transition-all duration-500", accentClass)}
                    style={{ width: `${(item.count / max) * 100}%` }}
                  />
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
