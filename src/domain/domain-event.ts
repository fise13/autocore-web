export const DOMAIN_EVENT_TYPES = [
  "OrderCreated",
  "OrderConfirmed",
  "OrderStarted",
  "OrderWaitingParts",
  "OrderCompleted",
  "OrderDelivered",
  "OrderCancelled",
  "EngineReserved",
  "EngineReleased",
  "EngineInstalled",
  "EngineSold",
  "InventoryReserved",
  "InventoryDeducted",
  "InventoryReleased",
  "SalaryCalculated",
  "FinancialTransactionCreated",
  "VehicleHistoryRecorded",
  "DocumentsGenerated",
  "WarrantyActivated",
  "QuoteCreated",
  "QuoteAccepted",
] as const;

export type DomainEventType = (typeof DOMAIN_EVENT_TYPES)[number];

export type DomainEventStatus = "pending" | "processed" | "failed";

export type DomainEvent = {
  id: string;
  companyId: string;
  type: DomainEventType;
  aggregateType: "work_order";
  aggregateId: string;
  payload: Record<string, unknown>;
  idempotencyKey: string;
  status: DomainEventStatus;
  createdAt: Date;
  processedAt?: Date;
  error?: string;
};

export type CreateDomainEventInput = Omit<
  DomainEvent,
  "id" | "createdAt" | "processedAt" | "status"
> & {
  id?: string;
  status?: DomainEventStatus;
};
