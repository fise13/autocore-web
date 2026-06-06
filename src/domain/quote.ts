import { WorkOrderLaborLine, WorkOrderMotorLine, WorkOrderPartLine, WorkOrderPricing } from "@/domain/work-order";

export const QUOTE_STATUSES = ["draft", "sent", "accepted", "expired", "converted"] as const;

export type QuoteStatus = (typeof QUOTE_STATUSES)[number];

export type Quote = {
  id: string;
  companyId: string;
  clientId: string;
  clientName?: string;
  clientPhone?: string;
  vehicleId?: string;
  vehicleLabel?: string;
  vin?: string;
  licensePlate?: string;
  mileage?: number;
  comment?: string;
  laborLines: WorkOrderLaborLine[];
  partLines: WorkOrderPartLine[];
  motorLines: WorkOrderMotorLine[];
  pricing: WorkOrderPricing;
  status: QuoteStatus;
  validUntil?: Date;
  convertedWorkOrderId?: string;
  documentInstanceId?: string;
  createdByUserId: string;
  createdAt: Date;
  updatedAt: Date;
};

export type CreateQuoteInput = Omit<Quote, "id" | "status" | "createdAt" | "updatedAt"> & {
  id?: string;
  status?: QuoteStatus;
};
