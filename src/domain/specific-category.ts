import type { InventoryGroupId, InventorySubcategoryId } from "@/domain/inventory-taxonomy";

export type SpecificColumnKind = "canonical" | "custom";

export type SpecificColumnDef = {
  id: string;
  key: string;
  title: string;
  kind: SpecificColumnKind;
  slotIndex?: number;
  width?: number;
  editable?: boolean;
};

export type SpecificCategoryEntity = {
  id: string;
  localId: number;
  name: string;
  companyId: string;
  groupId: InventoryGroupId;
  subcategoryId?: InventorySubcategoryId;
  columnSchema: SpecificColumnDef[];
};

export type SpecificRecordEntity = {
  id: string;
  categoryId: string;
  categoryLocalId: number;
  rowIndex: number;
  data: Record<string, string>;
  companyId: string;
  /** Dual-read with data.warehouseLocation / data["Место"]. */
  warehouseLocation?: string;
  primaryLocationId?: string;
  primaryLocationCode?: string;
};
