export const INVENTORY_IMPORT_STATUSES = [
  "parsing",
  "preview",
  "applying",
  "completed",
  "failed",
] as const;

export type InventoryImportStatus = (typeof INVENTORY_IMPORT_STATUSES)[number];

export type InventoryImportRow = {
  rowIndex: number;
  raw: Record<string, string>;
  normalized: Record<string, string | number | string[] | undefined>;
  confidence: number;
  errors: string[];
  duplicateOfItemId?: string;
  selected: boolean;
};

export type InventoryImportJob = {
  id: string;
  companyId: string;
  status: InventoryImportStatus;
  sourceFileName?: string;
  columnMapping: Record<string, string>;
  rows: InventoryImportRow[];
  stats: {
    total: number;
    valid: number;
    duplicates: number;
    errors: number;
  };
  createdByUserId: string;
  createdAt: Date;
  updatedAt?: Date;
  errorMessage?: string;
};
