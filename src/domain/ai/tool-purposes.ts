import type { CoreToolName } from "@/domain/ai/tool-schemas";

/**
 * Short purpose lines for `listCapabilities` and diagnostics.
 * Keep in sync when adding a tool to `coreToolTypes`.
 */
export const CORE_TOOL_PURPOSES = {
  listCapabilities: "List what Core can do for this user right now",
  searchInventory: "Search warehouse stock by name, SKU or brand",
  findStockLocation: "Find which bins hold a SKU",
  getWarehouseLocation: "Read what is in a warehouse cell",
  createInventoryItem: "Create a new stock item (barcode + name)",
  receiveStock: "Receive / increase on-hand quantity for an item",
  relocateStock: "Move stock to another location code or bin",
  listWorkOrders: "List work orders",
  getWorkOrder: "Read one work order in full",
  createWorkOrder: "Open a new work order for a client and vehicle",
  transitionWorkOrderStatus: "Move a work order to the next status",
  ensureWorkOrderDocuments: "Generate documents for a work order",
  createClient: "Create a customer record",
  searchEngines: "Search engines by brand, code or serial",
  createEngine: "Add an engine to inventory",
  sellEngine: "Mark an engine sold and record the sale",
  createEngineIntakeJob: "Start engine intake (photo/verify pipeline)",
  getFinanceSummary: "Income, expense and net for a period",
  createAccountingOperation: "Post an income or expense operation",
  navigateTo: "Open an AutoCore screen",
} as const satisfies Record<CoreToolName, string>;
