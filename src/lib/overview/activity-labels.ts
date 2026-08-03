import { ActivityModule, ActivitySeverity } from "@/domain/activity-log";
import { userCopy } from "@/lib/user-copy";

export type ActivityLabel = {
  label: string;
  module: ActivityModule;
  severity: ActivitySeverity;
};

type ActivityMeta = {
  module: ActivityModule;
  severity: ActivitySeverity;
};

const CATALOG: Record<string, ActivityMeta> = {
  "inventory.motor_created": { module: "inventory", severity: "info" },
  "inventory.motor_updated": { module: "inventory", severity: "info" },
  "inventory.motor_deleted": { module: "inventory", severity: "warning" },
  "inventory.motor_sold": { module: "inventory", severity: "info" },
  "inventory.motor_unsold": { module: "inventory", severity: "info" },
  "inventory.motor_imported": { module: "inventory", severity: "info" },
  "inventory.motor_import_started": { module: "inventory", severity: "info" },
  "inventory.motor_import_ai_mapped": { module: "inventory", severity: "info" },
  "inventory.motor_import_failed": { module: "inventory", severity: "warning" },
  "inventory.motor_import_rolled_back": { module: "inventory", severity: "warning" },
  "inventory.motor_exported": { module: "inventory", severity: "info" },
  "inventory.specific_category_created": { module: "inventory", severity: "info" },
  "inventory.specific_category_deleted": { module: "inventory", severity: "warning" },
  "inventory.specific_columns_updated": { module: "inventory", severity: "info" },
  "inventory.specific_record_deleted": { module: "inventory", severity: "info" },
  "inventory.specific_records_replaced": { module: "inventory", severity: "warning" },
  "inventory.specific_record_upserted": { module: "inventory", severity: "info" },
  "inventory.item_created": { module: "inventory", severity: "info" },
  "inventory.item_upserted": { module: "inventory", severity: "info" },
  "inventory.item_archived": { module: "inventory", severity: "warning" },
  "inventory.movement_created": { module: "inventory", severity: "info" },
  "inventory.transfer_completed": { module: "inventory", severity: "info" },
  "inventory.warehouse_created": { module: "inventory", severity: "info" },
  "inventory.supplier_created": { module: "inventory", severity: "info" },
  "inventory.document_created": { module: "inventory", severity: "info" },
  "inventory.import_completed": { module: "inventory", severity: "info" },
  "inventory.import_started": { module: "inventory", severity: "info" },
  "inventory.import_ai_mapped": { module: "inventory", severity: "info" },
  "inventory.import_failed": { module: "inventory", severity: "warning" },
  "inventory.import_rolled_back": { module: "inventory", severity: "warning" },
  "inventory.warehouse_cleared": { module: "inventory", severity: "critical" },
  "inventory.motors_cleared": { module: "inventory", severity: "critical" },
  "inventory.specifics_cleared": { module: "inventory", severity: "critical" },
  "accounting.operation_created": { module: "accounting", severity: "info" },
  "accounting.operation_updated": { module: "accounting", severity: "info" },
  "accounting.operation_deleted": { module: "accounting", severity: "warning" },
  "accounting.operations_cleared": { module: "accounting", severity: "critical" },
  "work_order.created": { module: "work_orders", severity: "info" },
  "work_order.status.confirmed": { module: "work_orders", severity: "info" },
  "work_order.status.in_progress": { module: "work_orders", severity: "info" },
  "work_order.status.waiting_parts": { module: "work_orders", severity: "info" },
  "work_order.status.completed": { module: "work_orders", severity: "info" },
  "work_order.status.delivered": { module: "work_orders", severity: "info" },
  "work_order.status.cancelled": { module: "work_orders", severity: "warning" },
  "employee.invited": { module: "employees", severity: "info" },
  "employee.joined_by_invite": { module: "employees", severity: "info" },
  "employee.joined_welcome": { module: "employees", severity: "info" },
  "employee.role_changed": { module: "employees", severity: "warning" },
  "employee.permissions_changed": { module: "employees", severity: "warning" },
  "employee.activated": { module: "employees", severity: "info" },
  "employee.deactivated": { module: "employees", severity: "warning" },
  "employee.removed": { module: "employees", severity: "critical" },
  "roles.seeded": { module: "employees", severity: "info" },
  "settings.data_cleanup": { module: "settings", severity: "warning" },
  "system.sync_completed": { module: "system", severity: "info" },
};

function inferModule(action: string): ActivityModule {
  const prefix = action.split(".")[0];
  if (prefix === "accounting") return "accounting";
  if (prefix === "work_order") return "work_orders";
  if (prefix === "employee" || prefix === "roles") return "employees";
  if (prefix === "settings") return "settings";
  if (prefix === "system") return "system";
  return "inventory";
}

export function resolveActivityLabel(action: string): ActivityLabel {
  const known = CATALOG[action];
  const actions = userCopy.overview.activityActions as Record<string, string>;
  const label = (known && actions[action]) || action.replace(/\./g, " · ");

  if (known) {
    return { label, module: known.module, severity: known.severity };
  }

  return {
    label,
    module: inferModule(action),
    severity: "info",
  };
}

export function moduleLabel(module: ActivityModule): string {
  return userCopy.overview.activityModules[module] ?? module;
}
