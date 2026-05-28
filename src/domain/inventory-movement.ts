export const MOVEMENT_TYPES = [
  "receipt",
  "issue",
  "reservation_hold",
  "reservation_release",
  "consumption",
  "transfer_out",
  "transfer_in",
  "adjustment",
  "return_in",
  "reversal",
] as const;

export type MovementType = (typeof MOVEMENT_TYPES)[number];

export const MOVEMENT_REFERENCE_TYPES = [
  "purchase",
  "sale",
  "work_order",
  "transfer",
  "import",
  "manual",
] as const;

export type MovementReferenceType = (typeof MOVEMENT_REFERENCE_TYPES)[number];

export type InventoryMovement = {
  id: string;
  companyId: string;
  itemId: string;
  warehouseId: string;

  type: MovementType;
  quantity: number;
  unitCost?: number;
  totalCost?: number;

  beforeOnHand: number;
  afterOnHand: number;
  beforeReserved: number;
  afterReserved: number;

  referenceType?: MovementReferenceType;
  referenceId?: string;
  documentId?: string;
  pairedMovementId?: string;

  reason?: string;
  idempotencyKey: string;
  reversalOfMovementId?: string;

  actorUserId: string;
  createdAt: Date;
};

export type RecordMovementInput = {
  companyId: string;
  itemId: string;
  warehouseId: string;
  type: MovementType;
  quantity: number;
  unitCost?: number;
  referenceType?: MovementReferenceType;
  referenceId?: string;
  documentId?: string;
  pairedMovementId?: string;
  reason?: string;
  idempotencyKey?: string;
  reversalOfMovementId?: string;
  actorUserId: string;
  adjustmentDirection?: "increase" | "decrease";
};
