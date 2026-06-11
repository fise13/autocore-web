import { DocumentContext } from "@/lib/documents/document-context";
import {
  laborLineAssigneeLabels,
  workOrderAssigneeSummary,
} from "@/lib/work-order/work-order-display";
import { laborLineTotal } from "@/lib/work-order/labor-pricing";

export function documentVehicleLabel(context: DocumentContext): string {
  if (context.vehicle) {
    return [context.vehicle.make, context.vehicle.model, context.vehicle.licensePlate].filter(Boolean).join(" ");
  }
  return context.order.vehicleLabel ?? "—";
}

export function documentClientName(context: DocumentContext): string {
  return context.client?.fullName ?? context.order.clientName ?? "—";
}

export function documentClientPhone(context: DocumentContext): string {
  return context.client?.phone ?? context.order.clientPhone ?? "—";
}

export function documentAssigneeSummary(context: DocumentContext): string {
  return workOrderAssigneeSummary(context.order, context.employees) || "—";
}

export function documentLaborLineAssignees(
  context: DocumentContext,
  line: DocumentContext["order"]["laborLines"][number],
): string {
  const names = laborLineAssigneeLabels(line, context.employees);
  return names.length > 0 ? names.join(", ") : "—";
}

export function documentLaborLineTotal(line: Parameters<typeof laborLineTotal>[0]): number {
  return laborLineTotal(line);
}

export function documentPrimaryMotor(context: DocumentContext) {
  return context.order.motorLines[0] ?? null;
}

export function documentPrimaryMotorEntity(context: DocumentContext) {
  const line = documentPrimaryMotor(context);
  if (!line) return null;
  return context.motors.find((motor) => motor.id === line.motorId) ?? null;
}

export function documentOrderDate(context: DocumentContext): Date {
  return context.order.completedAt ?? context.order.confirmedAt ?? context.order.createdAt;
}
