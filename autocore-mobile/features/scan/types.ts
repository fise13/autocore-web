export type ScanEntityKind =
  | 'engine'
  | 'transmission'
  | 'part'
  | 'customer'
  | 'invoice'
  | 'warranty'
  | 'order'
  | 'reservation'
  | 'shelf'
  | 'vin'
  | 'qr'
  | 'barcode';

export type ScanInventoryStatus =
  | 'in_stock'
  | 'reserved'
  | 'sold'
  | 'deficit'
  | 'ready'
  | 'pending_delivery';

export type ScanMatchType =
  | 'barcode_mapping'
  | 'sku'
  | 'barcode_field'
  | 'search_token'
  | 'fuzzy'
  | 'ai'
  | null;

export type ScanStockLevel = {
  warehouseId: string;
  warehouseName: string;
  onHand: number;
  reserved: number;
  available: number;
};

export type ScanCandidate = {
  id: string;
  sku: string;
  name: string;
  score: number;
  reason: string;
  sellPrice?: number;
  totalAvailable: number;
};

export type ScanResult = {
  id: string;
  kind: ScanEntityKind;
  code: string;
  title: string;
  subtitle?: string;
  shelf?: string;
  status?: ScanInventoryStatus;
  price?: number;
  vin?: string;
  customer?: string;
  matchType?: ScanMatchType;
  confidence?: number;
  stockLevels?: ScanStockLevel[];
  aiReasoning?: string;
  candidates?: ScanCandidate[];
};

export type RecentScan = {
  id: string;
  label: string;
  time: string;
  payload: string;
  itemId?: string;
};
