import { CompanyEmployee } from "@/domain/rbac";
import { WorkOrderLaborLine, WorkOrderStatus } from "@/domain/work-order";
import { ROLE_LABELS } from "@/components/work-orders/work-order-copy";
import { resolveEmployeeName } from "@/lib/work-order/work-order-display";
import { laborLineTotal, normalizeLaborPricingMode } from "@/lib/work-order/labor-pricing";

export function nextId(prefix: string) {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return `${prefix}-${crypto.randomUUID()}`;
  }
  return `${prefix}-${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

export function money(value: number) {
  return new Intl.NumberFormat("ru-KZ", {
    style: "currency",
    currency: "KZT",
    maximumFractionDigits: 0,
  }).format(value);
}

export function nextStatuses(status: WorkOrderStatus): WorkOrderStatus[] {
  if (status === "draft") return ["confirmed", "cancelled"];
  if (status === "confirmed") return ["in_progress", "waiting_parts", "cancelled"];
  if (status === "in_progress") return ["waiting_parts", "completed", "cancelled"];
  if (status === "waiting_parts") return ["in_progress", "completed", "cancelled"];
  if (status === "completed") return ["delivered"];
  return [];
}

export function isOpenStatus(status: WorkOrderStatus) {
  return !["completed", "delivered", "cancelled"].includes(status);
}

export function laborLineLabel(line: WorkOrderLaborLine, employees: CompanyEmployee[]) {
  const assigneeNames = line.assigneeIds
    .map((assigneeId) => resolveEmployeeName(assigneeId, employees))
    .filter(Boolean)
    .join(", ");
  const assignee = assigneeNames || "без исполнителя";
  const total = laborLineTotal(line);
  const mode = normalizeLaborPricingMode(line.pricingMode);
  const pricePart =
    mode === "fixed"
      ? money(total)
      : `${line.hours} ч × ${money(line.unitPrice)} = ${money(total)}`;
  return `${line.title} · ${pricePart} · ${assignee} (${ROLE_LABELS[line.assigneeRole]})`;
}
