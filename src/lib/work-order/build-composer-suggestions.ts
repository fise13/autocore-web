import type { DatalistOption } from "@/components/ui/datalist-input";
import type { InventoryItem } from "@/domain/inventory";
import type { MotorEntity } from "@/domain/motor";
import type { CompanyEmployee } from "@/domain/rbac";
import type { WorkOrder } from "@/domain/work-order";
import { EMPLOYEE_ROLE_LABELS } from "@/lib/work-order/work-order-display";
import { readComposerFieldValues } from "@/lib/work-order/composer-field-memory";

function uniqueOptions(options: DatalistOption[]): DatalistOption[] {
  const seen = new Set<string>();
  const result: DatalistOption[] = [];

  for (const option of options) {
    const value = option.value.trim();
    if (!value) continue;
    const key = value.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    result.push({ ...option, value });
  }

  return result;
}

function withRememberedValues(
  companyId: string | null | undefined,
  field: string,
  contextual: DatalistOption[],
): DatalistOption[] {
  const remembered = readComposerFieldValues(companyId, field).map((value) => ({ value }));
  return uniqueOptions([...remembered, ...contextual]);
}

export function buildLaborTitleOptions(
  companyId: string | null | undefined,
  orders: WorkOrder[],
  currentTitles: string[] = [],
): DatalistOption[] {
  const contextual: DatalistOption[] = [];
  for (const title of currentTitles) {
    const trimmed = title.trim();
    if (trimmed) contextual.push({ value: trimmed });
  }
  for (const order of orders) {
    for (const line of order.laborLines) {
      const trimmed = line.title.trim();
      if (trimmed) contextual.push({ value: trimmed });
    }
  }
  return withRememberedValues(companyId, "laborTitle", contextual);
}

export function buildAssigneeOptions(
  companyId: string | null | undefined,
  employees: CompanyEmployee[],
): DatalistOption[] {
  const contextual = employees.map((employee) => ({
    value: employee.fullName || employee.email,
    label: EMPLOYEE_ROLE_LABELS[employee.role] ?? employee.role,
  }));
  return withRememberedValues(companyId, "assignee", contextual);
}

export function buildPartSkuOptions(
  companyId: string | null | undefined,
  inventoryItems: InventoryItem[],
): DatalistOption[] {
  const contextual = inventoryItems
    .filter((item) => item.status === "active")
    .map((item) => ({
      value: item.sku,
      label: item.name,
    }));
  return withRememberedValues(companyId, "partSku", contextual);
}

export function buildPartNameOptions(
  companyId: string | null | undefined,
  inventoryItems: InventoryItem[],
): DatalistOption[] {
  const contextual = inventoryItems
    .filter((item) => item.status === "active")
    .map((item) => ({
      value: item.name,
      label: item.sku ? `${item.name} · ${item.sku}` : item.name,
    }));
  return withRememberedValues(companyId, "partName", contextual);
}

export function buildMotorSerialOptions(
  companyId: string | null | undefined,
  availableMotors: MotorEntity[],
  formatMotorLabel: (motor: MotorEntity) => string,
): DatalistOption[] {
  const contextual = availableMotors.map((motor) => {
    const label = [
      formatMotorLabel(motor),
      motor.serialCode !== formatMotorLabel(motor) ? motor.serialCode : null,
    ]
      .filter(Boolean)
      .join(" · ");
    return { value: motor.serialCode, label };
  });
  return withRememberedValues(companyId, "motorSerial", contextual);
}

export function buildPlateOptions(
  companyId: string | null | undefined,
  plates: string[],
): DatalistOption[] {
  const contextual = plates.filter(Boolean).map((plate) => ({ value: plate }));
  return withRememberedValues(companyId, "licensePlate", contextual);
}

export function buildVinOptions(companyId: string | null | undefined, vins: string[]): DatalistOption[] {
  const contextual = vins.filter(Boolean).map((vin) => ({ value: vin }));
  return withRememberedValues(companyId, "vin", contextual);
}
