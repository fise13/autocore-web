"use client";

import { motion } from "framer-motion";
import { Command, Radar } from "lucide-react";

import { ActivityTimeline } from "@/components/mission-control/activity/activity-timeline";
import { ModuleGrid } from "@/components/mission-control/module-grid";
import { OverviewBar } from "@/components/mission-control/overview-bar";
import { QuickActionsPanel } from "@/components/mission-control/quick-actions/quick-actions-panel";
import { useAuth } from "@/components/providers/auth-provider";
import { useBillingGate } from "@/components/billing/billing-gate-provider";
import { useMissionControlData } from "@/hooks/use-mission-control-data";
import { usePresenceHeartbeat } from "@/hooks/use-presence-heartbeat";
import { normalizeCompanyId } from "@/lib/company-id";

export function MissionControlShell() {
  const { profile } = useAuth();
  const { isPro } = useBillingGate();
  const companyId = normalizeCompanyId(profile?.companyId);
  const uid = profile?.id ?? "";

  const data = useMissionControlData({ profile, uid, companyId, isPro });
  usePresenceHeartbeat(companyId, uid, Boolean(profile?.companyId));

  const todayLabel = new Date().toLocaleDateString("ru-RU", {
    weekday: "long",
    day: "numeric",
    month: "long",
  });

  return (
    <div className="mc-theme mc-canvas mx-auto flex w-full max-w-[1600px] flex-col gap-7 pb-10">
      <header>
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
          className="flex flex-wrap items-end justify-between gap-4"
        >
          <div className="space-y-3">
            <div className="flex flex-wrap items-center gap-2">
              <span className="mc-live-badge">
                <span className="size-1.5 rounded-full bg-emerald-500 shadow-[0_0_8px_color-mix(in_oklab,var(--chart-2)_60%,transparent)]" />
                Live
              </span>
              <span className="rounded-full border border-border/60 bg-background/50 px-2.5 py-1 text-[11px] text-muted-foreground capitalize">
                {todayLabel}
              </span>
            </div>
            <div className="flex items-center gap-3">
              <div className="mc-icon-badge">
                <Radar className="size-4" />
              </div>
              <div>
                <p className="text-[11px] font-semibold tracking-[0.18em] text-primary uppercase">AutoCore</p>
                <h1 className="mc-hero-title text-3xl font-semibold tracking-tight md:text-4xl">Mission Control</h1>
              </div>
            </div>
            <p className="max-w-xl text-sm leading-relaxed text-muted-foreground">
              Операционный центр · состояние склада и финансов в одном экране
            </p>
          </div>

          <div className="mc-glass-panel flex items-center gap-2 rounded-2xl px-3 py-2 text-xs text-muted-foreground">
            <Command className="size-3.5 opacity-70" />
            <span>
              <kbd className="rounded border border-border/70 bg-muted/40 px-1.5 py-0.5 font-mono text-[10px]">⌘K</kbd>
              {" "}поиск
            </span>
            <span className="text-border">·</span>
            <span>
              <kbd className="rounded border border-border/70 bg-muted/40 px-1.5 py-0.5 font-mono text-[10px]">⌘S</kbd>
              {" "}сохранить
            </span>
          </div>
        </motion.div>
      </header>

      <OverviewBar metrics={data.overview} permissions={data.permissions} isLoading={data.isLoading} />

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_400px]">
        <div>
          <ModuleGrid {...data} />
        </div>

        <aside className="space-y-4 xl:sticky xl:top-4 xl:self-start">
          <QuickActionsPanel />
          <section className="mc-sidebar-panel overflow-hidden">
            <div className="flex items-center justify-between border-b border-border/50 px-4 py-3">
              <div>
                <h2 className="text-sm font-semibold tracking-tight">Журнал активности</h2>
                <p className="text-xs text-muted-foreground">
                  {data.permissions.canEmployees ? "Изменения команды в realtime" : "Склад и бухгалтерия"}
                </p>
              </div>
              <span className="mc-live-badge py-1 text-[10px]">
                <span className="size-1.5 rounded-full bg-emerald-500" />
                Online
              </span>
            </div>
            <div className="p-3 pt-2">
              <ActivityTimeline
                entries={data.activityLogs}
                isLoading={data.isLoading && data.permissions.canEmployees}
                error={data.activityError}
              />
            </div>
          </section>
        </aside>
      </div>
    </div>
  );
}
