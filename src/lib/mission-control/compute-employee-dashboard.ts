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

export type EmployeeMissionControlSnapshot = {
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
}): EmployeeMissionControlSnapshot {
  const { uid, canAccessEarnings } = input;
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
      text: waitingParts === 1 ? "наряд ждёт запчасти" : "нарядов ждут запчасти",
      tone: "warning",
      href: "/work-orders?status=waiting_parts",
    });
  }

  if (claimable.length > 0) {
    attentionItems.push({
      id: "claimable",
      count: claimable.length,
      text: claimable.length === 1 ? "свободный наряд" : "свободных нарядов",
      tone: "warning",
      href: "/work-orders",
    });
  }

  if (canAccessEarnings && summary.pending > 0) {
    attentionItems.push({
      id: "pending-pay",
      count: 1,
      text: "есть начисления к выплате",
      tone: "positive",
      href: "/my-earnings",
    });
  }

  const statTiles: EmployeeStatTile[] = [
    {
      key: "open",
      label: "Открытые наряды",
      value: summary.myOpen,
      format: "integer",
      hint: "в работе",
      href: "/work-orders",
    },
    {
      key: "closed-week",
      label: "Закрыто за неделю",
      value: closedThisWeekCount(scoped, uid, input.now),
      format: "integer",
      hint: "завершено",
    },
    {
      key: "claimable",
      label: "Свободные",
      value: summary.freePool,
      format: "integer",
      hint: "можно взять",
      href: "/work-orders",
    },
  ];

  if (canAccessEarnings) {
    statTiles.push({
      key: "pending",
      label: "К выплате",
      value: summary.pending,
      format: "currency",
      hint: "начисления",
      href: "/my-earnings",
    });
  } else {
    statTiles.push({
      key: "month",
      label: "Закрыто в месяце",
      value: summary.closedThisMonth,
      format: "integer",
      hint: "нарядов",
    });
  }

  let featuredInsight: EmployeeInsight | null = null;

  if (waitingParts > 0) {
    featuredInsight = {
      id: "waiting-parts-insight",
      title: `${waitingParts} наряд${waitingParts > 1 ? "а" : ""} ждут запчасти`,
      detail: "Проверьте статус заказов и сроки поставки — клиенты ждут.",
      cta: "Открыть наряды",
      href: "/work-orders?status=waiting_parts",
      tone: "warning",
    };
  } else if (claimable.length > 0) {
    featuredInsight = {
      id: "claimable-insight",
      title: `${claimable.length} свободн${claimable.length === 1 ? "ый наряд" : "ых наряда"}`,
      detail: "Можно взять в работу прямо сейчас.",
      cta: "Смотреть очередь",
      href: "/work-orders",
      tone: "positive",
    };
  } else if (canAccessEarnings && summary.growthPercent !== null && summary.growthPercent > 0) {
    featuredInsight = {
      id: "growth-insight",
      title: `Выплаты выросли на ${Math.round(summary.growthPercent)}%`,
      detail: "За последнюю неделю по сравнению с предыдущей.",
      cta: "Мои начисления",
      href: "/my-earnings",
      tone: "positive",
    };
  }

  const quickActions: EmployeeQuickAction[] = [
    {
      id: "orders",
      label: "Заказ-наряды",
      description: "Все назначенные и свободные.",
      href: "/work-orders",
    },
    {
      id: "new-order",
      label: "Новый наряд",
      description: "Создать заказ-наряд.",
      href: "/work-orders?compose=1",
    },
  ];

  if (canAccessEarnings) {
    quickActions.push({
      id: "earnings",
      label: "Мои начисления",
      description: "Выплаты и графики.",
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
