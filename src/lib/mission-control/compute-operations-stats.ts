import { ActivityLogEntry } from "@/domain/rbac";
import { ActivityModule } from "@/domain/activity-log";
import { activityModuleFromEntry } from "@/lib/mission-control/compute-overview-metrics";

export type ModuleChangeCounts = Record<ActivityModule, number>;

export type ContributorStat = {
  actorId: string;
  actorName: string;
  count: number;
};

export type OperationsStats = {
  editsTodayByModule: ModuleChangeCounts;
  totalEditsToday: number;
  topContributors: ContributorStat[];
  importExportCount: number;
  syncEventsToday: number;
};

function startOfToday(): Date {
  const now = new Date();
  return new Date(now.getFullYear(), now.getMonth(), now.getDate());
}

const EMPTY_MODULES: ModuleChangeCounts = {
  inventory: 0,
  accounting: 0,
  employees: 0,
  settings: 0,
  system: 0,
};

export function computeOperationsStats(activityLogs: ActivityLogEntry[]): OperationsStats {
  const todayStart = startOfToday().getTime();
  const todayLogs = activityLogs.filter((entry) => (entry.timestamp?.getTime() ?? 0) >= todayStart);

  const editsTodayByModule: ModuleChangeCounts = { ...EMPTY_MODULES };
  const contributorMap = new Map<string, ContributorStat>();

  let importExportCount = 0;
  let syncEventsToday = 0;

  for (const entry of todayLogs) {
    const module = activityModuleFromEntry(entry) as ActivityModule;
    if (module in editsTodayByModule) {
      editsTodayByModule[module] += 1;
    }

    const actorId = entry.actor;
    const actorName = entry.actorName?.trim() || actorId.slice(0, 8);
    const existing = contributorMap.get(actorId);
    if (existing) {
      existing.count += 1;
    } else {
      contributorMap.set(actorId, { actorId, actorName, count: 1 });
    }

    if (
      entry.action.includes("import") ||
      entry.action.includes("export") ||
      entry.action.includes("imported") ||
      entry.action.includes("exported")
    ) {
      importExportCount += 1;
    }

    if (entry.action.includes("sync")) {
      syncEventsToday += 1;
    }
  }

  const topContributors = [...contributorMap.values()]
    .sort((a, b) => b.count - a.count)
    .slice(0, 5);

  return {
    editsTodayByModule,
    totalEditsToday: todayLogs.length,
    topContributors,
    importExportCount,
    syncEventsToday,
  };
}
