export const OPERATION_TYPES = [
  "sale",
  "income",
  "refund",
  "expense",
  "transfer",
] as const;

export const PAYMENT_METHODS = ["cash", "transfer", "mixed"] as const;
export const OPERATION_ACCOUNTS = ["cashbox", "kaspi"] as const;

export type OperationType = (typeof OPERATION_TYPES)[number];
export type PaymentMethod = (typeof PAYMENT_METHODS)[number];
export type OperationAccount = (typeof OPERATION_ACCOUNTS)[number];

export type FinancialOperation = {
  id: string;
  cloudDocumentId?: string | null;
  companyId: string;
  type: OperationType;
  amount: number;
  paymentMethod: PaymentMethod;
  account: OperationAccount;
  cashReceived?: number | null;
  changeGiven?: number | null;
  relatedMotorID?: number | null;
  createdAt: Date;
  createdByUserId: string;
  comment?: string | null;
  category?: string | null;
  description?: string | null;
  source?: string | null;
  details?: string | null;
  updatedAt?: Date;
};

export type CreateFinancialOperationInput = {
  companyId: string;
  type: OperationType;
  amount: number;
  paymentMethod: PaymentMethod;
  account: OperationAccount;
  cashReceived?: number | null;
  changeGiven?: number | null;
  relatedMotorID?: number | null;
  comment?: string | null;
  category?: string | null;
  description?: string | null;
  source?: string | null;
  details?: string | null;
  createdByUserId: string;
};
