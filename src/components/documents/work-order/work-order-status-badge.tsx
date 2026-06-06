import { WorkOrderStatus } from "@/domain/work-order";
import { STATUS_LABELS } from "@/components/work-orders/work-order-copy";
import { workOrderDisplayNumber } from "@/lib/work-order/work-order-display";

const STATUS_CLASS: Record<WorkOrderStatus, string> = {
  draft: "doc-sr-badge doc-sr-badge-neutral",
  confirmed: "doc-sr-badge doc-sr-badge-violet",
  in_progress: "doc-sr-badge doc-sr-badge-blue",
  waiting_parts: "doc-sr-badge doc-sr-badge-amber",
  completed: "doc-sr-badge doc-sr-badge-green",
  delivered: "doc-sr-badge doc-sr-badge-green",
  cancelled: "doc-sr-badge doc-sr-badge-red",
};

type WorkOrderStatusBadgeProps = {
  status: WorkOrderStatus;
};

export function WorkOrderStatusBadge({ status }: WorkOrderStatusBadgeProps) {
  return <span className={STATUS_CLASS[status]}>{STATUS_LABELS[status]}</span>;
}

export function workOrderDocumentNumber(order: { number: string; id: string }): number {
  const trimmed = order.number.trim();
  if (/^\d+$/.test(trimmed)) return Number(trimmed);
  return workOrderDisplayNumber(order);
}
