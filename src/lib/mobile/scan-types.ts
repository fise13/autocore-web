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

export type MobileScanMatchType =
  | "barcode_mapping"
  | "sku"
  | "barcode_field"
  | "search_token"
  | "fuzzy"
  | "ai"
  | null;

export type MobileScanCandidate = {
  item: MobileScanItem;
  score: number;
  reason: string;
};

export type MobileScanResolveResult = {
  found: boolean;
  confidence: number;
  barcode: string;
  matchType: MobileScanMatchType;
  item: MobileScanItem | null;
  candidates: MobileScanCandidate[];
  stockLevels: MobileScanStockLevel[];
  aiReasoning?: string;
};
