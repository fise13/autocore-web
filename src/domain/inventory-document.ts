export const INVENTORY_DOCUMENT_TYPES = [
  "receipt",
  "issue",
  "transfer",
  "adjustment",
  "inventory_report",
] as const;

export type InventoryDocumentType = (typeof INVENTORY_DOCUMENT_TYPES)[number];

export const INVENTORY_DOCUMENT_STATUSES = ["draft", "finalized", "voided"] as const;
export type InventoryDocumentStatus = (typeof INVENTORY_DOCUMENT_STATUSES)[number];

export type InventoryDocument = {
  id: string;
  companyId: string;
  type: InventoryDocumentType;
  status: InventoryDocumentStatus;
  referenceType?: string;
  referenceId?: string;
  movementIds: string[];
  storagePath?: string;
  exportPath?: string;
  metadata: Record<string, string>;
  createdByUserId: string;
  createdAt: Date;
};
