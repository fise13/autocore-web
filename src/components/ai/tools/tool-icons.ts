import {
  ArrowLeftRight,
  Banknote,
  ClipboardList,
  Cog,
  FileText,
  ListChecks,
  MapPin,
  Navigation,
  Package,
  PackagePlus,
  Plus,
  Receipt,
  Search,
  UserPlus,
  Warehouse,
  Wrench,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";

import type { CoreToolName } from "@/domain/ai/tool-schemas";

/**
 * One icon per tool, shared by the activity pill and the result card so a
 * step keeps the same visual identity from "running" through to "done".
 */
export const TOOL_ICONS: Record<CoreToolName | "generic", LucideIcon> = {
  listCapabilities: ListChecks,
  searchInventory: Package,
  findStockLocation: MapPin,
  getWarehouseLocation: Warehouse,
  createInventoryItem: PackagePlus,
  receiveStock: PackagePlus,
  relocateStock: ArrowLeftRight,
  listWorkOrders: Wrench,
  getWorkOrder: Wrench,
  createWorkOrder: ClipboardList,
  transitionWorkOrderStatus: ClipboardList,
  ensureWorkOrderDocuments: FileText,
  createClient: UserPlus,
  searchEngines: Cog,
  createEngine: Plus,
  sellEngine: Banknote,
  createEngineIntakeJob: Plus,
  getFinanceSummary: Receipt,
  createAccountingOperation: Receipt,
  navigateTo: Navigation,
  generic: Search,
};
