export type WorkOrderConsumptionLine = {
  itemId: string;
  quantity: number;
  unitCost?: number;
  note?: string;
};

export type ConsumeForWorkOrderInput = {
  companyId: string;
  workOrderId: string;
  warehouseId?: string;
  lines: WorkOrderConsumptionLine[];
  actorUserId: string;
  reason?: string;
  createAccountingEntries?: boolean;
};
