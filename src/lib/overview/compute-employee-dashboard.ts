import { WorkOrder } from "@/domain/work-order";
import { PayrollTransaction } from "@/domain/payroll-transaction";
import {
  claimableOrders,
  closedThisWeekCount,
  computeMyEarningsSummary,
  openAssignedOrders,
  scopedWorkOrdersForEmployee,
  waitingPartsAssignedCount,
  type WeekBar,
} from "@/lib/my-earnings/compute-my-earnings";
import { userCopy } from "@/lib/user-copy";

export type EmployeeAttentionItem = {
  id: string;
  count: number;
  text: string;
  tone: "warning" | "danger" | "positive";
  href: string;
};

export type EmployeeInsight = {
  id: string;
  title: string;
  detail: string;
  cta: string;
  href: string;
  tone: "neutral" | "positive" | "warning";
};

export type EmployeeStatTile = {
  key: string;
  label: string;
  value: number;
  format: "integer" | "currency";
  hint?: string;
  href?: string;
};

export type EmployeeQuickAction = {
  id: string;
  label: string;
  description: string;
  href: string;
};

export type EmployeeOverviewSnapshot = {
  summary: ReturnType<typeof computeMyEarningsSummary>;
  attentionItems: EmployeeAttentionItem[];
  featuredInsight: EmployeeInsight | null;
  statTiles: EmployeeStatTile[];
  quickActions: EmployeeQuickAction[];
  openOrders: WorkOrder[];
  claimablePreview: WorkOrder[];
  closedOrdersWeekBars: WeekBar[];
  earningsWeekBars: WeekBar[];
};

export function computeEmployeeDashboard(input: {
  workOrders: WorkOrder[];
  transactions: PayrollTransaction[];
  uid: string;
  canAccessEarnings: boolean;
  now?: Date;
}): EmployeeOverviewSnapshot {
  const { uid, canAccessEarnings } = input;
  const copy = userCopy.overview.employee;
  const scoped = scopedWorkOrdersForEmployee(input.workOrders, uid);
  const summary = computeMyEarningsSummary({
    transactions: input.transactions,
    workOrders: scoped,
    uid,
    now: input.now,
  });

  const attentionItems: EmployeeAttentionItem[] = [];
  const waitingParts = waitingPartsAssignedCount(scoped, uid);
  const claimable = claimableOrders(scoped);

  if (waitingParts > 0) {
    attentionItems.push({
      id: "waiting-parts",
      count: waitingParts,
      text: waitingParts === 1 ? copy.attention.waitingPartsOne : copy.attention.waitingPartsMany,
      tone: "warning",
      href: "/work-orders?status=waiting_parts",
    });
  }

  if (claimable.length > 0) {
    attentionItems.push({
      id: "claimable",
      count: claimable.length,
      text: claimable.length === 1 ? copy.attention.claimableOne : copy.attention.claimableMany,
      tone: "warning",
      href: "/work-orders",
    });
  }

  if (canAccessEarnings && summary.pending > 0) {
    attentionItems.push({
      id: "pending-pay",
      count: 1,
      text: copy.attention.pendingPay,
      tone: "positive",
      href: "/my-earnings",
    });
  }

  const statTiles: EmployeeStatTile[] = [
    {
      key: "open",
      label: copy.stats.openOrders,
      value: summary.myOpen,
      format: "integer",
      hint: copy.stats.openHint,
      href: "/work-orders",
    },
    {
      key: "closed-week",
      label: copy.stats.closedWeek,
      value: closedThisWeekCount(scoped, uid, input.now),
      format: "integer",
      hint: copy.stats.closedWeekHint,
    },
    {
      key: "claimable",
      label: copy.stats.claimable,
      value: summary.freePool,
      format: "integer",
      hint: copy.stats.claimableHint,
      href: "/work-orders",
    },
  ];

  if (canAccessEarnings) {
    statTiles.push({
      key: "pending",
      label: copy.stats.pending,
      value: summary.pending,
      format: "currency",
      hint: copy.stats.pendingHint,
      href: "/my-earnings",
    });
  } else {
    statTiles.push({
      key: "month",
      label: copy.stats.closedMonth,
      value: summary.closedThisMonth,
      format: "integer",
      hint: copy.stats.closedMonthHint,
    });
  }

  let featuredInsight: EmployeeInsight | null = null;

  if (waitingParts > 0) {
    featuredInsight = {
      id: "waiting-parts-insight",
      title: copy.insights.waitingPartsTitle(waitingParts),
      detail: copy.insights.waitingPartsDetail,
      cta: copy.insights.waitingPartsCta,
      href: "/work-orders?status=waiting_parts",
      tone: "warning",
    };
  } else if (claimable.length > 0) {
    featuredInsight = {
      id: "claimable-insight",
      title: copy.insights.claimableTitle(claimable.length),
      detail: copy.insights.claimableDetail,
      cta: copy.insights.claimableCta,
      href: "/work-orders",
      tone: "positive",
    };
  } else if (canAccessEarnings && summary.growthPercent !== null && summary.growthPercent > 0) {
    featuredInsight = {
      id: "growth-insight",
      title: copy.insights.growthTitle(Math.round(summary.growthPercent)),
      detail: copy.insights.growthDetail,
      cta: copy.insights.growthCta,
      href: "/my-earnings",
      tone: "positive",
    };
  }

  const quickActions: EmployeeQuickAction[] = [
    {
      id: "orders",
      label: copy.actions.orders,
      description: copy.actions.ordersDesc,
      href: "/work-orders",
    },
    {
      id: "new-order",
      label: copy.actions.newOrder,
      description: copy.actions.newOrderDesc,
      href: "/work-orders?compose=1",
    },
  ];

  if (canAccessEarnings) {
    quickActions.push({
      id: "earnings",
      label: copy.actions.earnings,
      description: copy.actions.earningsDesc,
      href: "/my-earnings",
    });
  }

  return {
    summary,
    attentionItems,
    featuredInsight,
    statTiles: statTiles.slice(0, 4),
    quickActions,
    openOrders: openAssignedOrders(scoped, uid).slice(0, 5),
    claimablePreview: claimable.slice(0, 4),
    closedOrdersWeekBars: summary.productivityWeekBars,
    earningsWeekBars: summary.earningsWeekBars,
  };
}
