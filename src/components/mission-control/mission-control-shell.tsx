"use client";

import { motion } from "framer-motion";
import { Command, LayoutDashboard } from "lucide-react";
import { useSyncExternalStore } from "react";

import { useCommandPalette } from "@/components/mission-control/command-palette/command-palette-provider";
import { McDashboardGrid } from "@/components/mission-control/dashboard/mc-dashboard-grid";
import { useAuth } from "@/components/providers/auth-provider";
import { useBillingGate } from "@/components/billing/billing-gate-provider";
import { useMissionControlData } from "@/hooks/use-mission-control-data";
import { usePresenceHeartbeat } from "@/hooks/use-presence-heartbeat";
import { normalizeCompanyId } from "@/lib/company-id";
import { getSearchShortcutLabel } from "@/lib/keyboard-shortcut";
import { mcPageVariants, mcSectionVariants } from "@/lib/motion/mission-control-motion";

function subscribeNoop() {
  return () => {};
}

function getSearchShortcutSnapshot() {
  return getSearchShortcutLabel();
}

export function MissionControlShell() {
  const { profile } = useAuth();
  const { isPro } = useBillingGate();
  const { setOpen } = useCommandPalette();
  const companyId = normalizeCompanyId(profile?.companyId);
  const uid = profile?.id ?? "";
  const searchShortcut = useSyncExternalStore(subscribeNoop, getSearchShortcutSnapshot, () => "⌘K");

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
      className="mc-theme mc-canvas mx-auto flex w-full max-w-[1600px] flex-col gap-5 pb-8"
    >
      <motion.header variants={mcSectionVariants} className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex min-w-0 items-center gap-3">
          <div className="mc-icon-badge">
            <LayoutDashboard className="size-4" />
          </div>
          <div className="min-w-0">
            <h1 className="mc-hero-title text-2xl font-semibold tracking-tight md:text-[1.75rem]">
              Центр управления
            </h1>
            <p className="text-sm capitalize text-muted-foreground">{todayLabel}</p>
          </div>
        </div>

        <button
          type="button"
          className="mc-glass-panel flex cursor-pointer items-center gap-2 rounded-xl px-2.5 py-1.5 text-xs text-muted-foreground transition-colors duration-200 hover:text-foreground"
          onClick={() => setOpen(true)}
          aria-label="Открыть командную палитру"
        >
          <Command className="size-3.5 opacity-70" aria-hidden />
          <kbd className="rounded border border-border/70 bg-muted/40 px-1.5 py-0.5 font-mono text-[10px]">
            {searchShortcut}
          </kbd>
        </button>
      </motion.header>

      <motion.div variants={mcSectionVariants}>
        <McDashboardGrid {...data} />
      </motion.div>
    </motion.div>
  );
}
