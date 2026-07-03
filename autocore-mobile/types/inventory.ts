export const INVENTORY_ITEM_TYPES = [
  'consumable',
  'oil',
  'filter',
  'liquid',
  'installation',
  'service',
  'generic',
] as const;

export type InventoryItemType = (typeof INVENTORY_ITEM_TYPES)[number];

export const INVENTORY_ITEM_STATUSES = ['active', 'discontinued', 'archived'] as const;
export type InventoryItemStatus = (typeof INVENTORY_ITEM_STATUSES)[number];

export type InventoryItem = {
  id: string;
  companyId: string;
  type: InventoryItemType;
  sku: string;
  name: string;
  description?: string;
  barcodes: string[];
  brandName?: string;
  warehouseLocation?: string;
  unit: string;
  sellPrice?: number;
  purchasePrice?: number;
  totalOnHand: number;
  totalReserved: number;
  totalAvailable: number;
  status: InventoryItemStatus;
  updatedAt?: Date;
};

export type MobileScanStockLevel = {
  warehouseId: string;
  warehouseName: string;
  onHand: number;
  reserved: number;
  available: number;
};

export type MobileScanItem = {
  id: string;
  sku: string;
  name: string;
  unit: string;
  barcodes?: string[];
  brandName?: string;
  warehouseLocation?: string;
  sellPrice?: number;
  purchasePrice?: number;
  totalOnHand: number;
  totalReserved: number;
  totalAvailable: number;
  lowStockThreshold?: number;
};

export type MobileScanResolveResult = {
  found: boolean;
  confidence: number;
  barcode: string;
  matchType:
    | 'barcode_mapping'
    | 'sku'
    | 'barcode_field'
    | 'search_token'
    | 'fuzzy'
    | 'ai'
    | null;
  item: MobileScanItem | null;
  candidates: Array<{
    item: MobileScanItem;
    score: number;
    reason: string;
  }>;
  stockLevels: MobileScanStockLevel[];
  aiReasoning?: string;
};

export type MobileQuickReceiveResult = {
  movementId: string;
  warehouseId: string;
  onHand: number;
  available: number;
  itemTotalOnHand: number;
  itemTotalAvailable: number;
};

export type ScanOcrResolveResponse = {
  ocr: {
    barcodes: string[];
    partNumbers: string[];
    brand?: string;
    confidence: number;
    warnings: string[];
  };
  resolve: MobileScanResolveResult | null;
  extractedCodes: string[];
};
