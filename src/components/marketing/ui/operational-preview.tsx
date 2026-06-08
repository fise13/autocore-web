"use client";

import {
  Activity,
  AlertTriangle,
  Banknote,
  ClipboardList,
  Package,
  Radar,
  TrendingUp,
  Users,
  Wallet,
} from "lucide-react";

import { FeedList } from "@/components/marketing/ui/feed-list";
import { useSimulatedFeed } from "@/components/marketing/hooks/use-simulated-feed";
import { cn } from "@/lib/utils";

const KPI = [
  { label: "Выручка сегодня", value: "₽ 2,4 млн", icon: TrendingUp, tone: "text-emerald-500" },
  { label: "Открытые наряды", value: "12", icon: Activity, tone: "text-primary" },
  { label: "SKU на складе", value: "4 892", icon: Package, tone: "text-primary" },
  { label: "Команда онлайн", value: "6", icon: Users, tone: "text-emerald-500" },
  { label: "Низкий остаток", value: "3", icon: AlertTriangle, tone: "text-amber-500" },
  { label: "Баланс", value: "₽ 18,6 млн", icon: Wallet, tone: "text-primary" },
  { label: "Авансы", value: "₽ 240 тыс.", icon: Banknote, tone: "text-amber-500" },
] as const;

const SHOWCASE_KPI = KPI.slice(0, 5);

const MODULE_TILES = [
  {
    name: "Склад",
    value: "4 892 поз.",
    detail: "3 алерта остатка",
    bars: [88, 62, 45],
  },
  {
    name: "Бухгалтерия",
    value: "₽ 2,4 млн",
    detail: "7 операций сегодня",
    bars: [72, 54, 38],
  },
  {
    name: "Инвентарь",
    value: "128 моторов",
    detail: "14 в резерве",
    bars: [64, 48, 56],
  },
  {
    name: "Сотрудники",
    value: "6 онлайн",
    detail: "12 в команде",
    bars: [92, 68, 44],
  },
] as const;

type OperationalPreviewProps = {
  className?: string;
  large?: boolean;
  /** Fixed layout for product page frames — no overlap at narrow widths */
  layout?: "default" | "showcase";
};

export function OperationalPreview({
  className,
  large,
  layout = "default",
}: OperationalPreviewProps) {
  const events = useSimulatedFeed(3200);
  const isShowcase = layout === "showcase";
  const kpiItems = isShowcase ? SHOWCASE_KPI : KPI;

  return (
    <div
      className={cn(
        "site-preview-frame overflow-hidden",
        isShowcase && "marketing-preview-showcase",
        large && !isShowcase && "min-h-[400px]",
        className,
      )}
    >
      <div className="flex items-center gap-2 border-b border-border bg-muted/40 px-3 py-2.5 sm:px-4 sm:py-3">
        <div className="flex gap-1.5">
          <span className="size-2.5 rounded-full bg-red-400" />
          <span className="size-2.5 rounded-full bg-amber-400" />
          <span className="size-2.5 rounded-full bg-emerald-500" />
        </div>
        <span className="mx-auto truncate text-[10px] text-muted-foreground sm:text-xs">
          app.autocore · Mission Control
        </span>
        <span className="site-chip py-0.5 text-[10px]">
          <span className="size-1.5 rounded-full bg-emerald-500" />
          Live
        </span>
      </div>

      <div className={cn(isShowcase ? "p-4 sm:p-5" : "space-y-5", large && !isShowcase && "p-6 md:p-8", !isShowcase && !large && "p-4 md:p-5")}>
        <div className={cn("flex flex-wrap items-center justify-between gap-3", isShowcase && "mb-4")}>
          <div className="flex items-center gap-3">
            <FeatureIconWrap icon={Radar} />
            <div>
              <p className="text-[10px] font-semibold tracking-[0.16em] text-primary uppercase">AutoCore</p>
              <p className={cn("font-semibold tracking-tight", large || isShowcase ? "text-lg" : "text-lg")}>
                Mission Control
              </p>
            </div>
          </div>
          {!isShowcase ? (
            <p className="text-sm text-muted-foreground">Операционный центр</p>
          ) : (
            <span className="marketing-preview-chip">
              <ClipboardList className="size-3" aria-hidden />
              Демо-компания
            </span>
          )}
        </div>

        <div className={cn("autocore-surface-group", isShowcase ? "p-3 sm:p-4" : "p-4")}>
          <p className="mb-3 text-[10px] font-medium uppercase tracking-wide text-muted-foreground sm:text-xs">
            Обзор
          </p>
          <div
            className={cn(
              isShowcase
                ? "marketing-preview-kpi-row"
                : "grid grid-cols-2 gap-3 sm:grid-cols-4 lg:grid-cols-7",
            )}
          >
            {kpiItems.map((item) => (
              <div key={item.label} className="autocore-metric-card marketing-preview-kpi p-2.5 sm:p-3">
                <item.icon className={cn("size-3.5 opacity-90 sm:size-4", item.tone)} />
                <p className="mt-1.5 text-xs font-semibold tabular-nums sm:mt-2 sm:text-sm">{item.value}</p>
                <p className="text-[9px] leading-tight text-muted-foreground sm:text-[10px]">{item.label}</p>
              </div>
            ))}
          </div>
        </div>

        {isShowcase ? (
          <div className="marketing-preview-showcase-body">
            <div className="marketing-preview-modules">
              {MODULE_TILES.map((module) => (
                <article key={module.name} className="marketing-preview-module-card">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <p className="text-xs font-semibold sm:text-sm">{module.name}</p>
                      <p className="mt-1 text-[10px] text-muted-foreground sm:text-xs">{module.detail}</p>
                    </div>
                    <p className="text-xs font-semibold tabular-nums text-primary">{module.value}</p>
                  </div>
                  <div className="mt-3 flex items-end gap-1">
                    {module.bars.map((height, index) => (
                      <span
                        key={`${module.name}-${index}`}
                        className="marketing-preview-bar"
                        style={{ height: `${height}%` }}
                      />
                    ))}
                  </div>
                </article>
              ))}
            </div>

            <aside className="marketing-preview-feed">
              <p className="text-xs font-semibold sm:text-sm">Журнал активности</p>
              <div className="mt-2 min-h-0 flex-1 overflow-hidden">
                <FeedList events={events} compact />
              </div>
            </aside>
          </div>
        ) : (
          <div className={cn("grid gap-4", large ? "lg:grid-cols-[1fr_260px]" : "lg:grid-cols-[1fr_220px]")}>
            <div className="grid gap-3 sm:grid-cols-2">
              {MODULE_TILES.map((module) => (
                <div key={module.name} className="rounded-xl border border-border bg-card p-4 shadow-sm">
                  <p className="text-sm font-semibold">{module.name}</p>
                  <p className="mt-1 text-xs text-muted-foreground">{module.detail}</p>
                  <div className="mt-3 flex items-end gap-1">
                    {module.bars.map((height, index) => (
                      <span
                        key={`${module.name}-${index}`}
                        className="marketing-preview-bar"
                        style={{ height: `${height * 0.35}px` }}
                      />
                    ))}
                  </div>
                </div>
              ))}
            </div>
            <div className="rounded-xl border border-border bg-card p-4 shadow-sm">
              <p className="text-sm font-semibold">Журнал активности</p>
              <div className="mt-3">
                <FeedList events={events} compact />
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function FeatureIconWrap({ icon: Icon }: { icon: typeof Radar }) {
  return (
    <div className="flex size-9 items-center justify-center rounded-lg border border-primary/20 bg-primary/10 text-primary sm:size-10">
      <Icon className="size-4 sm:size-5" strokeWidth={1.75} />
    </div>
  );
}
