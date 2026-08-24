export const STOCKTAKE_STATUSES = ["open", "committed", "cancelled"] as const;
export type StocktakeStatus = (typeof STOCKTAKE_STATUSES)[number];

export type StocktakeLine = {
  itemId: string;
  sku: string;
  name: string;
  expectedQty: number;
  countedQty: number;
};

export type StocktakeSession = {
  id: string;
  companyId: string;
  warehouseId?: string;
  status: StocktakeStatus;
  lines: StocktakeLine[];
  createdAt: Date;
  updatedAt: Date;
  createdByUserId: string;
  committedAt?: Date;
};

export function stocktakeDifference(line: StocktakeLine): number {
  return line.countedQty - line.expectedQty;
}
