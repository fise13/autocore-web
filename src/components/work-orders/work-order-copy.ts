import { WorkOrderAssigneeRole, WorkOrderStatus } from "@/domain/work-order";

export const STATUS_LABELS: Record<WorkOrderStatus, string> = {
  draft: "Черновик",
  confirmed: "Подтверждён",
  in_progress: "В работе",
  waiting_parts: "Ждём запчасти",
  completed: "Готов",
  delivered: "Выдан",
  cancelled: "Отменён",
};

export const STATUS_HINTS: Record<WorkOrderStatus, string> = {
  draft: "Заказ создан, можно редактировать состав",
  confirmed: "Клиент согласовал, можно начинать работу",
  in_progress: "Мастера выполняют работы",
  waiting_parts: "Ожидание поставки со склада",
  completed: "Работы завершены, можно выдать авто",
  delivered: "Автомобиль передан клиенту",
  cancelled: "Заказ закрыт без выполнения",
};

export const ROLE_LABELS: Record<WorkOrderAssigneeRole, string> = {
  mechanic: "Механик",
  diagnostician: "Диагност",
  manager: "Менеджер",
};

export const TRANSITION_LABELS: Partial<Record<WorkOrderStatus, string>> = {
  confirmed: "Подтвердить заказ",
  in_progress: "Начать работу",
  waiting_parts: "Ждём запчасти",
  completed: "Завершить работы",
  delivered: "Выдать клиенту",
  cancelled: "Отменить",
};

export function transitionLabel(from: WorkOrderStatus, to: WorkOrderStatus): string {
  if (to === "in_progress" && from === "waiting_parts") return "Продолжить работу";
  if (to === "in_progress" && from === "confirmed") return "Начать работу";
  return TRANSITION_LABELS[to] ?? STATUS_LABELS[to];
}

export function statusTone(status: WorkOrderStatus): string {
  if (status === "completed" || status === "delivered") return "bg-emerald-500/10 text-emerald-700 ring-emerald-500/20";
  if (status === "cancelled") return "bg-destructive/10 text-destructive ring-destructive/20";
  if (status === "in_progress") return "bg-blue-500/10 text-blue-700 ring-blue-500/20";
  if (status === "waiting_parts") return "bg-amber-500/10 text-amber-700 ring-amber-500/20";
  if (status === "confirmed") return "bg-violet-500/10 text-violet-700 ring-violet-500/20";
  return "bg-muted text-muted-foreground ring-border/60";
}

export function eventTypeLabel(type: string): string {
  const map: Record<string, string> = {
    OrderCreated: "Заказ создан",
    OrderConfirmed: "Заказ подтверждён",
    OrderStarted: "Работы начаты",
    OrderWaitingParts: "Ожидание запчастей",
    OrderCompleted: "Работы завершены",
    OrderDelivered: "Авто выдано",
    OrderCancelled: "Заказ отменён",
    EngineReserved: "Двигатель зарезервирован",
    EngineReleased: "Резерв двигателя снят",
    EngineInstalled: "Двигатель установлен",
    InventoryReserved: "Запчасти зарезервированы",
    InventoryDeducted: "Запчасти списаны",
    InventoryReleased: "Резерв запчастей снят",
    SalaryCalculated: "Зарплата рассчитана",
    FinancialTransactionCreated: "Финансовая операция",
    VehicleHistoryRecorded: "История авто обновлена",
    DocumentsGenerated: "Документы сформированы",
  };
  return map[type] ?? type;
}
