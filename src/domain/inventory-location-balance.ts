/**
 * Qty of an item sitting on a specific warehouse location (bin / custom leaf).
 * Warehouse stock levels remain the rollup across locations.
 */
export type InventoryLocationBalance = {
  id: string;
  companyId: string;
  itemId: string;
  warehouseId: string;
  locationId: string;
  onHand: number;
  reserved: number;
  available: number;
  updatedAt?: Date;
};
