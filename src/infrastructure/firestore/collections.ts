/**
 * Firestore collection names used by Core's read tools.
 *
 * The repo declares these as local consts in ~22 repository files; this module
 * is the shared source for new code rather than a repo-wide migration.
 *
 * Two shapes exist and the distinction matters for every query:
 * - **Top-level** collections carry a `companyId` field and MUST be filtered on
 *   it (the Admin SDK bypasses Firestore rules entirely).
 * - **Company-scoped** collections live under `companies/{companyId}/…` and are
 *   already tenant-isolated by path.
 */

/** Top-level — always `.where("companyId", "==", …)`. */
export const TOP_LEVEL_COLLECTIONS = {
  financialOperations: "financialOperations",
  inventoryItems: "inventoryItems",
  inventoryLocationBalances: "inventoryLocationBalances",
  inventoryStockLevels: "inventoryStockLevels",
  warehouseLocations: "warehouseLocations",
  warehouses: "warehouses",
  motors: "motors",
  specificRecords: "specificRecords",
  documents: "documents",
} as const;

/** Nested under `companies/{companyId}` — tenant-isolated by path. */
export const COMPANY_COLLECTIONS = {
  workOrders: "workOrders",
  employees: "employees",
  clients: "clients",
  vehicles: "vehicles",
  activityLogs: "activityLogs",
} as const;

export const COMPANIES_COLLECTION = "companies";
