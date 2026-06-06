"use client";

import { memo } from "react";
import { BarChart3 } from "lucide-react";

import { OperationsStats } from "@/lib/mission-control/compute-operations-stats";
import { moduleLabel } from "@/lib/mission-control/activity-labels";
import { ActivityModule } from "@/domain/activity-log";
import { McModuleHeader } from "@/components/mission-control/mc-module-header";

type OperationsStatsModuleProps = {
  stats: OperationsStats;
  isLoading: boolean;
};

const MODULE_ORDER: ActivityModule[] = ["inventory", "work_orders", "accounting", "employees", "settings", "system"];

const MODULE_COLORS: Record<ActivityModule, string> = {
  inventory: "bg-chart-2",
  work_orders: "bg-chart-3",
  accounting: "bg-chart-1",
  employees: "bg-chart-5",
  settings: "bg-chart-4",
  system: "bg-muted-foreground",
};

export const OperationsStatsModule = memo(function OperationsStatsModule({
  stats,
  isLoading,
}: OperationsStatsModuleProps) {
  const maxModuleCount = Math.max(1, ...MODULE_ORDER.map((m) => stats.editsTodayByModule[m]));

  return (
    <article className="mc-module-card">
      <McModuleHeader
        icon={BarChart3}
        title="Операционная статистика"
        description="Изменения и активность команды сегодня"
        accent="amber"
      />
      <div className="mc-module-body space-y-4">
        {isLoading ? (
          <div className="space-y-3">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="h-8 animate-pulse rounded-lg bg-muted/50" />
            ))}
          </div>
        ) : (
          <>
            <div className="grid grid-cols-3 gap-3">
              <MiniStat label="Изменений" value={stats.totalEditsToday} />
              <MiniStat label="Импорт/экспорт" value={stats.importExportCount} />
              <MiniStat label="Обновлений" value={stats.syncEventsToday} />
            </div>

            <div className="space-y-2.5">
              <p className="mc-section-label">По модулям</p>
              {MODULE_ORDER.map((module) => {
                const count = stats.editsTodayByModule[module];
                if (count === 0 && module === "settings") return null;
                return (
                  <div key={module} className="space-y-1.5">
                    <div className="flex items-center justify-between text-xs">
                      <span className="font-medium">{moduleLabel(module)}</span>
                      <span className="tabular-nums text-muted-foreground">{count}</span>
                    </div>
                    <div className="h-2 overflow-hidden rounded-full bg-muted/80">
                      <div
                        className={`h-full rounded-full transition-all duration-500 ${MODULE_COLORS[module]}`}
                        style={{ width: `${(count / maxModuleCount) * 100}%` }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>

            <div className="space-y-2">
              <p className="mc-section-label">Топ участников</p>
              {stats.topContributors.length === 0 ? (
                <p className="text-sm text-muted-foreground">Сегодня изменений ещё не было</p>
              ) : (
                stats.topContributors.map((contributor, index) => (
                  <div
                    key={contributor.actorId}
                    className="mc-list-row flex items-center justify-between gap-3 text-sm"
                  >
                    <div className="flex items-center gap-2.5">
                      <span className="flex size-6 items-center justify-center rounded-md bg-muted text-[10px] font-semibold tabular-nums text-muted-foreground">
                        {index + 1}
                      </span>
                      <span className="font-medium">{contributor.actorName}</span>
                    </div>
                    <span className="rounded-full bg-primary/10 px-2 py-0.5 text-xs font-medium tabular-nums text-primary">
                      {contributor.count}
                    </span>
                  </div>
                ))
              )}
            </div>
          </>
        )}
      </div>
    </article>
  );
});

function MiniStat({ label, value }: { label: string; value: number }) {
  return (
    <div className="mc-stat-chip text-center">
      <p className="text-[10px] text-muted-foreground uppercase">{label}</p>
      <p className="mt-0.5 text-xl font-semibold tabular-nums tracking-tight">{value}</p>
    </div>
  );
}
