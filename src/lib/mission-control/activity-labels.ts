import { ActivityModule, ActivitySeverity } from "@/domain/activity-log";

export type ActivityLabel = {
  label: string;
  module: ActivityModule;
  severity: ActivitySeverity;
};

const CATALOG: Record<string, ActivityLabel> = {
  "inventory.motor_created": { label: "добавил мотор", module: "inventory", severity: "info" },
  "inventory.motor_updated": { label: "обновил мотор", module: "inventory", severity: "info" },
  "inventory.motor_deleted": { label: "удалил мотор", module: "inventory", severity: "warning" },
  "inventory.motor_sold": { label: "продал мотор", module: "inventory", severity: "info" },
  "inventory.motor_unsold": { label: "вернул мотор", module: "inventory", severity: "info" },
  "inventory.motor_imported": { label: "импортировал моторы", module: "inventory", severity: "info" },
  "inventory.motor_exported": { label: "экспортировал моторы", module: "inventory", severity: "info" },
  "inventory.specific_category_created": { label: "создал категорию специфичных", module: "inventory", severity: "info" },
  "inventory.specific_records_replaced": { label: "заменил записи специфичных", module: "inventory", severity: "warning" },
  "inventory.specific_record_upserted": { label: "обновил запись специфичных", module: "inventory", severity: "info" },
  "inventory.item_created": { label: "добавил позицию на склад", module: "inventory", severity: "info" },
  "inventory.item_upserted": { label: "обновил позицию на складе", module: "inventory", severity: "info" },
  "inventory.item_archived": { label: "архивировал позицию", module: "inventory", severity: "warning" },
  "inventory.movement_created": { label: "зафиксировал движение склада", module: "inventory", severity: "info" },
  "inventory.transfer_completed": { label: "выполнил перемещение", module: "inventory", severity: "info" },
  "inventory.warehouse_created": { label: "создал склад", module: "inventory", severity: "info" },
  "inventory.supplier_created": { label: "добавил поставщика", module: "inventory", severity: "info" },
  "inventory.document_created": { label: "создал складской документ", module: "inventory", severity: "info" },
  "inventory.import_completed": { label: "завершил импорт склада", module: "inventory", severity: "info" },
  "inventory.warehouse_cleared": { label: "очистил склад", module: "inventory", severity: "critical" },
  "inventory.motors_cleared": { label: "очистил моторы", module: "inventory", severity: "critical" },
  "inventory.specifics_cleared": { label: "очистил специфичные", module: "inventory", severity: "critical" },
  "accounting.operation_created": { label: "добавил операцию", module: "accounting", severity: "info" },
  "accounting.operation_updated": { label: "изменил операцию", module: "accounting", severity: "info" },
  "accounting.operation_deleted": { label: "удалил операцию", module: "accounting", severity: "warning" },
  "accounting.operations_cleared": { label: "очистил бухгалтерию", module: "accounting", severity: "critical" },
  "employee.invited": { label: "пригласил сотрудника", module: "employees", severity: "info" },
  "employee.joined_by_invite": { label: "присоединился по приглашению", module: "employees", severity: "info" },
  "employee.role_changed": { label: "изменил роль сотрудника", module: "employees", severity: "warning" },
  "employee.permissions_changed": { label: "изменил права сотрудника", module: "employees", severity: "warning" },
  "employee.activated": { label: "активировал сотрудника", module: "employees", severity: "info" },
  "employee.deactivated": { label: "деактивировал сотрудника", module: "employees", severity: "warning" },
  "employee.removed": { label: "удалил сотрудника", module: "employees", severity: "critical" },
  "roles.seeded": { label: "инициализировал роли", module: "employees", severity: "info" },
  "settings.data_cleanup": { label: "выполнил очистку данных", module: "settings", severity: "warning" },
  "system.sync_completed": { label: "синхронизировал данные", module: "system", severity: "info" },
};

export function resolveActivityLabel(action: string): ActivityLabel {
  const known = CATALOG[action];
  if (known) return known;

  const prefix = action.split(".")[0];
  const module: ActivityModule =
    prefix === "accounting"
      ? "accounting"
      : prefix === "employee" || prefix === "roles"
        ? "employees"
        : prefix === "settings"
          ? "settings"
          : prefix === "system"
            ? "system"
            : "inventory";

  return {
    label: action.replace(/\./g, " · "),
    module,
    severity: "info",
  };
}

export function moduleLabel(module: ActivityModule): string {
  switch (module) {
    case "inventory":
      return "Склад";
    case "accounting":
      return "Бухгалтерия";
    case "employees":
      return "Команда";
    case "settings":
      return "Настройки";
    case "system":
      return "Система";
    default:
      return module;
  }
}
