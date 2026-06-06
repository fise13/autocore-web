import { MovementType } from "@/domain/inventory-movement";

const MOVEMENT_TYPE_LABELS: Record<MovementType, string> = {
  receipt: "Поступление",
  issue: "Выдача",
  reservation_hold: "Резерв",
  reservation_release: "Снятие резерва",
  consumption: "Списание",
  transfer_out: "Перемещение (отправка)",
  transfer_in: "Перемещение (приём)",
  adjustment: "Корректировка",
  return_in: "Возврат на склад",
  reversal: "Отмена движения",
};

export function movementTypeLabel(type: MovementType | string): string {
  return MOVEMENT_TYPE_LABELS[type as MovementType] ?? String(type).replace(/_/g, " ");
}
