export const WORK_ORDER_STATUSES = [
  'draft',
  'confirmed',
  'in_progress',
  'waiting_parts',
  'completed',
  'delivered',
  'cancelled',
] as const;

export type WorkOrderStatus = (typeof WORK_ORDER_STATUSES)[number];

export const WORK_ORDER_ASSIGNEE_ROLES = ['mechanic', 'diagnostician', 'manager'] as const;
export type WorkOrderAssigneeRole = (typeof WORK_ORDER_ASSIGNEE_ROLES)[number];

export const WORK_ORDER_LABOR_PRICING_MODES = ['hourly', 'fixed'] as const;
export type WorkOrderLaborPricingMode = (typeof WORK_ORDER_LABOR_PRICING_MODES)[number];

export const WORK_ORDER_MOTOR_OUTCOMES = ['install', 'sell'] as const;
export type WorkOrderMotorOutcome = (typeof WORK_ORDER_MOTOR_OUTCOMES)[number];

export type WorkOrderLaborLine = {
  id: string;
  title: string;
  description?: string;
  pricingMode?: WorkOrderLaborPricingMode;
  hours: number;
  unitPrice: number;
  assigneeIds: string[];
  assigneeDisplayNames?: string[];
  assigneeRole: WorkOrderAssigneeRole;
};

export type WorkOrderPartSource = 'warehouse' | 'adhoc' | 'specific_quick';

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
  specificCategoryId?: string;
  specificCategoryName?: string;
  warrantyTemplateId?: string;
};

export type WorkOrderMotorLine = {
  id: string;
  motorId: string;
  serialCode: string;
  brandName?: string;
  engineCode?: string;
  configuration?: string;
  unitPrice: number;
  outcome: WorkOrderMotorOutcome;
  warrantyTemplateId?: string;
};

export type WorkOrderPricing = {
  laborTotal: number;
  partsTotal: number;
  motorsTotal: number;
  discount: number;
  grandTotal: number;
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
  | 'id'
  | 'number'
  | 'status'
  | 'createdAt'
  | 'updatedAt'
  | 'confirmedAt'
  | 'completedAt'
  | 'deliveredAt'
  | 'cancelledAt'
> & {
  id?: string;
  number?: string;
  status?: WorkOrderStatus;
};

export type UpdateWorkOrderInput = Partial<
  Pick<
    WorkOrder,
    | 'clientId'
    | 'clientName'
    | 'clientPhone'
    | 'vehicleId'
    | 'vehicleLabel'
    | 'vin'
    | 'licensePlate'
    | 'mileage'
    | 'comment'
    | 'laborLines'
    | 'partLines'
    | 'motorLines'
    | 'pricing'
    | 'updatedByUserId'
  >
>;

export function calculateWorkOrderPricing(
  laborLines: WorkOrderLaborLine[],
  partLines: WorkOrderPartLine[],
  motorLines: WorkOrderMotorLine[],
  discount = 0,
): WorkOrderPricing {
  const laborTotal = laborLines.reduce(
    (sum, line) => sum + (line.pricingMode === 'fixed' ? line.unitPrice : line.hours * line.unitPrice),
    0,
  );
  const partsTotal = partLines.reduce((sum, line) => sum + line.quantity * line.unitPrice, 0);
  const motorsTotal = motorLines.reduce((sum, line) => sum + line.unitPrice, 0);
  const grandTotal = Math.max(0, laborTotal + partsTotal + motorsTotal - discount);
  return { laborTotal, partsTotal, motorsTotal, discount, grandTotal };
}
