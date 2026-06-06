import { OperationAccount, PaymentMethod } from "@/domain/financial-operation";

export const WORK_ORDER_STATUSES = [
  "draft",
  "confirmed",
  "in_progress",
  "waiting_parts",
  "completed",
  "delivered",
  "cancelled",
] as const;

export type WorkOrderStatus = (typeof WORK_ORDER_STATUSES)[number];

export const WORK_ORDER_ASSIGNEE_ROLES = ["mechanic", "diagnostician", "manager"] as const;

export type WorkOrderAssigneeRole = (typeof WORK_ORDER_ASSIGNEE_ROLES)[number];

export const WORK_ORDER_LABOR_PRICING_MODES = ["hourly", "fixed"] as const;

export type WorkOrderLaborPricingMode = (typeof WORK_ORDER_LABOR_PRICING_MODES)[number];

export const WORK_ORDER_MOTOR_OUTCOMES = ["install", "sell"] as const;

export type WorkOrderMotorOutcome = (typeof WORK_ORDER_MOTOR_OUTCOMES)[number];

export type WorkOrderLaborLine = {
  id: string;
  title: string;
  description?: string;
  pricingMode?: WorkOrderLaborPricingMode;
  hours: number;
  unitPrice: number;
  assigneeIds: string[];
  assigneeRole: WorkOrderAssigneeRole;
};

export type WorkOrderPartSource = "warehouse" | "adhoc";

export type WorkOrderPartLine = {
  id: string;
  itemId?: string;
  source?: WorkOrderPartSource;
  sku?: string;
  name: string;
  quantity: number;
  unitPrice: number;
  unitCost: number;
  warehouseId?: string;
};

export function isWarehousePartLine(line: WorkOrderPartLine): boolean {
  return line.source !== "adhoc" && Boolean(line.itemId?.trim());
}

export type WorkOrderMotorLine = {
  id: string;
  motorId: string;
  serialCode: string;
  brandName?: string;
  engineCode?: string;
  configuration?: string;
  unitPrice: number;
  outcome: WorkOrderMotorOutcome;
};

export type WorkOrderPricing = {
  laborTotal: number;
  partsTotal: number;
  motorsTotal: number;
  discount: number;
  grandTotal: number;
};

export type WorkOrderDocumentType =
  | "work_order_pdf"
  | "completion_act"
  | "maintenance_tag"
  | "engine_warranty"
  | "client_invoice"
  | "engine_waybill"
  | "commercial_proposal";

export type WorkOrderDocument = {
  id: string;
  companyId: string;
  workOrderId: string;
  type: WorkOrderDocumentType;
  title: string;
  storagePath?: string;
  downloadUrl?: string;
  createdAt: Date;
};

export type WorkOrder = {
  id: string;
  companyId: string;
  number: string;
  status: WorkOrderStatus;
  clientId: string;
  clientName?: string;
  clientPhone?: string;
  vehicleId: string;
  vehicleLabel?: string;
  vin: string;
  licensePlate: string;
  mileage: number;
  comment?: string;
  laborLines: WorkOrderLaborLine[];
  partLines: WorkOrderPartLine[];
  motorLines: WorkOrderMotorLine[];
  pricing: WorkOrderPricing;
  paymentAccount?: OperationAccount;
  paymentMethod?: PaymentMethod;
  createdByUserId: string;
  updatedByUserId?: string;
  createdAt: Date;
  updatedAt: Date;
  confirmedAt?: Date;
  completedAt?: Date;
  deliveredAt?: Date;
  cancelledAt?: Date;
};

export type CreateWorkOrderInput = Omit<
  WorkOrder,
  | "id"
  | "number"
  | "status"
  | "createdAt"
  | "updatedAt"
  | "confirmedAt"
  | "completedAt"
  | "deliveredAt"
  | "cancelledAt"
> & {
  id?: string;
  number?: string;
  status?: WorkOrderStatus;
};

export type UpdateWorkOrderInput = Partial<
  Pick<
    WorkOrder,
    | "clientId"
    | "clientName"
    | "clientPhone"
    | "vehicleId"
    | "vehicleLabel"
    | "vin"
    | "licensePlate"
    | "mileage"
    | "comment"
    | "laborLines"
    | "partLines"
    | "motorLines"
    | "pricing"
    | "paymentAccount"
    | "paymentMethod"
    | "updatedByUserId"
  >
>;

import { laborLineTotal } from "@/lib/work-order/labor-pricing";

export function calculateWorkOrderPricing(
  laborLines: WorkOrderLaborLine[],
  partLines: WorkOrderPartLine[],
  motorLines: WorkOrderMotorLine[],
  discount = 0,
): WorkOrderPricing {
  const laborTotal = laborLines.reduce((sum, line) => sum + laborLineTotal(line), 0);
  const partsTotal = partLines.reduce((sum, line) => sum + line.quantity * line.unitPrice, 0);
  const motorsTotal = motorLines.reduce((sum, line) => sum + line.unitPrice, 0);
  const grandTotal = Math.max(0, laborTotal + partsTotal + motorsTotal - discount);

  return { laborTotal, partsTotal, motorsTotal, discount, grandTotal };
}
