import { WorkOrderAssigneeRole } from "@/domain/work-order";

export const PAYROLL_TRANSACTION_STATUSES = ["pending", "paid", "cancelled"] as const;
export const PAYROLL_RATE_TYPES = ["percent", "fixed", "hourly"] as const;

export type PayrollTransactionStatus = (typeof PAYROLL_TRANSACTION_STATUSES)[number];
export type PayrollRateType = (typeof PAYROLL_RATE_TYPES)[number];

export type PayrollTransaction = {
  id: string;
  companyId: string;
  employeeId: string;
  workOrderId: string;
  laborLineId: string;
  role: WorkOrderAssigneeRole;
  amount: number;
  rateType: PayrollRateType;
  rate: number;
  status: PayrollTransactionStatus;
  createdAt: Date;
  paidAt?: Date;
};
