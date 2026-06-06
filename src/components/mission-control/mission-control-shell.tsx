"use client";

import { motion } from "framer-motion";
import { Command, LayoutDashboard } from "lucide-react";

import { ActivityTimeline } from "@/components/mission-control/activity/activity-timeline";
import { ModuleGrid } from "@/components/mission-control/module-grid";
import { OverviewBar } from "@/components/mission-control/overview-bar";
import { QuickActionsPanel } from "@/components/mission-control/quick-actions/quick-actions-panel";
import { DashboardImportProgress } from "@/components/warehouse/import/shared/import-progress-host";
import { useAuth } from "@/components/providers/auth-provider";
import { useBillingGate } from "@/components/billing/billing-gate-provider";
import { useMissionControlData } from "@/hooks/use-mission-control-data";
import { usePresenceHeartbeat } from "@/hooks/use-presence-heartbeat";
import { normalizeCompanyId } from "@/lib/company-id";
import { mcPageVariants, mcSectionVariants } from "@/lib/motion/mission-control-motion";

export function MissionControlShell() {
  const { profile } = useAuth();
  const { isPro } = useBillingGate();
  const companyId = normalizeCompanyId(profile?.companyId);
  const uid = profile?.id ?? "";

  const data = useMissionControlData({ profile, uid, companyId, isPro });
  usePresenceHeartbeat(companyId, uid, Boolean(profile?.companyId));

  const todayLabel = new Date().toLocaleDateString("ru-RU", {
    weekday: "short",
    day: "numeric",
    month: "short",
  });

  return (
    <motion.div
      variants={mcPageVariants}
      initial="hidden"
      animate="show"
      className="mc-theme mc-canvas mx-auto flex w-full max-w-[1560px] flex-col gap-5 pb-8"
    >
      <motion.header variants={mcSectionVariants} className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex min-w-0 items-center gap-3">
          <div className="mc-icon-badge">
            <LayoutDashboard className="size-4" />
          </div>
          <div className="min-w-0">
            <h1 className="mc-hero-title text-2xl font-semibold tracking-tight md:text-[1.75rem]">
              Mission Control
            </h1>
            <p className="text-sm capitalize text-muted-foreground">{todayLabel}</p>
          </div>
        </div>

        <button
          type="button"
          className="mc-glass-panel flex items-center gap-2 rounded-xl px-2.5 py-1.5 text-xs text-muted-foreground"
          onClick={() => document.dispatchEvent(new KeyboardEvent("keydown", { key: "k", metaKey: true }))}
        >
          <Command className="size-3.5 opacity-70" />
          <kbd className="rounded border border-border/70 bg-muted/40 px-1.5 py-0.5 font-mono text-[10px]">⌘K</kbd>
        </button>
      </motion.header>

      <motion.div variants={mcSectionVariants}>
        <OverviewBar metrics={data.overview} permissions={data.permissions} isLoading={data.isLoading} />
      </motion.div>

      <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_340px]">
        <motion.div variants={mcSectionVariants}>
          <ModuleGrid {...data} />
        </motion.div>

        <motion.aside variants={mcSectionVariants} className="space-y-3 xl:sticky xl:top-4 xl:self-start">
          <DashboardImportProgress variant="panel" />
          <QuickActionsPanel />
          <section className="mc-sidebar-panel overflow-hidden">
            <div className="border-b border-border/50 px-3.5 py-2.5">
              <h2 className="text-sm font-semibold tracking-tight">Активность</h2>
            </div>
            <div className="p-3 pt-2">
              <ActivityTimeline
                entries={data.activityLogs}
                isLoading={data.isLoading && data.permissions.canEmployees}
                error={data.activityError}
              />
            </div>
          </section>
        </motion.aside>
      </div>
    </motion.div>
  );
}
