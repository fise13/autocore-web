"use client";

import {
  Activity,
  AlertTriangle,
  Banknote,
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
  { label: "Выручка сегодня", value: "₽ 2,4 млн", icon: TrendingUp, tone: "text-emerald-600" },
  { label: "Открытые наряды", value: "12", icon: Activity, tone: "text-blue-600" },
  { label: "SKU на складе", value: "4 892", icon: Package, tone: "text-blue-600" },
  { label: "Команда онлайн", value: "6", icon: Users, tone: "text-emerald-600" },
  { label: "Низкий остаток", value: "3", icon: AlertTriangle, tone: "text-amber-600" },
  { label: "Баланс", value: "₽ 18,6 млн", icon: Wallet, tone: "text-blue-600" },
  { label: "Авансы", value: "₽ 240 тыс.", icon: Banknote, tone: "text-amber-600" },
] as const;

const MODULES = ["Склад", "Бухгалтерия", "Инвентарь", "Сотрудники"] as const;

type OperationalPreviewProps = {
  className?: string;
  large?: boolean;
};

export function OperationalPreview({ className, large }: OperationalPreviewProps) {
  const events = useSimulatedFeed(3200);

  return (
    <div className={cn("site-preview-frame overflow-hidden", large && "min-h-[400px]", className)}>
      <div className="flex items-center gap-2 border-b border-border bg-muted/40 px-4 py-3">
        <div className="flex gap-1.5">
          <span className="size-2.5 rounded-full bg-red-400" />
          <span className="size-2.5 rounded-full bg-amber-400" />
          <span className="size-2.5 rounded-full bg-emerald-500" />
        </div>
        <span className="mx-auto text-xs text-muted-foreground">app.autocore · Mission Control</span>
        <span className="site-chip py-0.5 text-[10px]">
          <span className="size-1.5 rounded-full bg-emerald-500" />
          Live
        </span>
      </div>

      <div className={cn("space-y-5", large ? "p-6 md:p-8" : "p-4 md:p-5")}>
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <FeatureIconWrap icon={Radar} />
            <div>
              <p className="text-[10px] font-semibold tracking-[0.16em] text-primary uppercase">AutoCore</p>
              <p className={cn("font-semibold tracking-tight", large ? "text-xl" : "text-lg")}>Mission Control</p>
            </div>
          </div>
          <p className="text-sm text-muted-foreground">Операционный центр</p>
        </div>

        <div className="autocore-surface-group p-4">
          <p className="mb-3 text-xs font-medium text-muted-foreground uppercase">Обзор</p>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 lg:grid-cols-7">
            {KPI.map((item) => (
              <div key={item.label} className="autocore-metric-card p-3">
                <item.icon className={cn("size-4 opacity-80", item.tone)} />
                <p className="mt-2 text-sm font-semibold tabular-nums">{item.value}</p>
                <p className="text-[10px] text-muted-foreground">{item.label}</p>
              </div>
            ))}
          </div>
        </div>

        <div className={cn("grid gap-4", large ? "lg:grid-cols-[1fr_260px]" : "lg:grid-cols-[1fr_220px]")}>
          <div className="grid gap-3 sm:grid-cols-2">
            {MODULES.map((module) => (
              <div key={module} className="rounded-xl border border-border bg-card p-4 shadow-sm">
                <p className="text-sm font-semibold">{module}</p>
                <div className="mt-3 space-y-2">
                  <div className="h-2 w-3/4 rounded-full bg-muted" />
                  <div className="h-2 w-1/2 rounded-full bg-muted/80" />
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
      </div>
    </div>
  );
}

function FeatureIconWrap({ icon: Icon }: { icon: typeof Radar }) {
  return (
    <div className="flex size-10 items-center justify-center rounded-lg border border-primary/20 bg-primary/10 text-primary">
      <Icon className="size-5" strokeWidth={1.75} />
    </div>
  );
}
