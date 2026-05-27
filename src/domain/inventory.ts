export type InventoryItem = {
  id: string;
  companyId: string;
  name: string;
  sku?: string;
  quantity: number;
  unit?: string;
  createdAt?: Date;
  updatedAt?: Date;
};
