import type { InventoryGroupId, InventorySubcategoryId } from "@/domain/inventory-taxonomy";

export const INVENTORY_ITEM_TYPES = [
  "consumable",
  "oil",
  "filter",
  "liquid",
  "installation",
  "service",
  "generic",
] as const;
export type InventoryItemType = (typeof INVENTORY_ITEM_TYPES)[number];

export const INVENTORY_ITEM_STATUSES = ["active", "discontinued", "archived"] as const;
export type InventoryItemStatus = (typeof INVENTORY_ITEM_STATUSES)[number];

export type InventoryItem = {
  id: string;
  companyId: string;
  localId?: number;
  type: InventoryItemType;

  sku: string;
  name: string;
  description?: string;
  barcodes: string[];

  brandId?: string;
  brandName?: string;
  supplierName?: string;
  warehouseLocation?: string;
  notes?: string;

  categoryId?: string;
  categoryPath?: string[];
  inventoryGroup?: InventoryGroupId;
  subcategoryId?: InventorySubcategoryId;
  unit: string;

  purchasePrice?: number;
  averageCost?: number;
  sellPrice?: number;
  currency: string;

  totalOnHand: number;
  totalReserved: number;
  totalAvailable: number;
  stockValue: number;

  status: InventoryItemStatus;
  lowStockThreshold?: number;
  reorderPoint?: number;

  imageUrls?: string[];
  documentIds?: string[];

  searchTokens: string[];

  createdAt?: Date;
  updatedAt?: Date;
  createdByUserId?: string;
  updatedByUserId?: string;
};

export type UpsertInventoryItemInput = {
  companyId: string;
  localId?: number;
  type?: InventoryItemType;
  sku: string;
  name: string;
  description?: string;
  barcodes?: string[];
  brandId?: string;
  brandName?: string;
  supplierName?: string;
  warehouseLocation?: string;
  notes?: string;
  categoryId?: string;
  categoryPath?: string[];
  inventoryGroup?: InventoryGroupId;
  subcategoryId?: InventorySubcategoryId;
  unit?: string;
  purchasePrice?: number;
  averageCost?: number;
  sellPrice?: number;
  currency?: string;
  status?: InventoryItemStatus;
  lowStockThreshold?: number;
  reorderPoint?: number;
  imageUrls?: string[];
  documentIds?: string[];
  actorUserId?: string;
};

export type InventoryStockLevel = {
  id: string;
  companyId: string;
  itemId: string;
  warehouseId: string;
  onHand: number;
  reserved: number;
  available: number;
  updatedAt?: Date;
};

export type InventoryCategory = {
  id: string;
  companyId: string;
  name: string;
  parentId?: string;
  path: string[];
  createdAt?: Date;
  updatedAt?: Date;
};
