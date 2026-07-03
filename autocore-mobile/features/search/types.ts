export type SearchFilterId =
  | 'all'
  | 'engines'
  | 'gearboxes'
  | 'parts'
  | 'documents'
  | 'clients'
  | 'sales'
  | 'orders'
  | 'accounting';

export type InventoryStatus =
  | 'in_stock'
  | 'reserved'
  | 'sold'
  | 'deficit'
  | 'ready'
  | 'pending_delivery';

export type SearchResultKind =
  | 'engine'
  | 'gearbox'
  | 'part'
  | 'document'
  | 'client'
  | 'sale'
  | 'order'
  | 'vehicle'
  | 'accounting';

export type SearchEngine = {
  id: string;
  code: string;
  vehicle: string;
  status: InventoryStatus;
  shelf: string;
  price: number;
  vin?: string;
};

export type SearchResultItem = {
  id: string;
  kind: SearchResultKind;
  title: string;
  subtitle?: string;
  meta?: string;
  status?: InventoryStatus;
  shelf?: string;
  price?: number;
  vin?: string;
};

export type SearchResultGroup = {
  id: string;
  title: string;
  filter: SearchFilterId | 'vehicles';
  items: SearchResultItem[];
};

export type SearchFilterOption = {
  id: SearchFilterId;
  label: string;
};

export type QuickCategory = {
  id: SearchFilterId;
  label: string;
};
