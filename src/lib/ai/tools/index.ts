import "server-only";

import { tool, type ToolSet } from "ai";

import { hasPermission } from "@autocore/rbac";

import { CORE_TOOL_PURPOSES } from "@/domain/ai/tool-purposes";
import { allowedRouteList, isAllowedHref } from "@/domain/ai/internal-href";
import {
  createAccountingOperationInput,
  createClientInput,
  createEngineInput,
  createEngineIntakeJobInput,
  createInventoryItemInput,
  createWorkOrderInput,
  ensureWorkOrderDocumentsInput,
  findStockLocationInput,
  getFinanceSummaryInput,
  getWarehouseLocationInput,
  getWorkOrderInput,
  listCapabilitiesInput,
  listWorkOrdersInput,
  navigateToInput,
  receiveStockInput,
  relocateStockInput,
  searchEnginesInput,
  searchInventoryInput,
  sellEngineInput,
  transitionWorkOrderStatusInput,
  type CoreToolName,
} from "@/domain/ai/tool-schemas";
import { createClient } from "@/lib/ai/tools/clients.server";
import { describeToolError, toolFailure, type CoreToolContext } from "@/lib/ai/tools/context";
import { ensureWorkOrderDocuments } from "@/lib/ai/tools/documents.server";
import {
  createEngine,
  createEngineIntakeJob,
  searchEngines,
  sellEngine,
} from "@/lib/ai/tools/engines.server";
import { createAccountingOperation, getFinanceSummary } from "@/lib/ai/tools/finance.server";
import {
  createInventoryItem,
  findStockLocation,
  receiveStock,
  relocateStock,
  searchInventory,
} from "@/lib/ai/tools/inventory.server";
import { getWarehouseLocation } from "@/lib/ai/tools/warehouse.server";
import {
  createWorkOrder,
  getWorkOrder,
  listWorkOrders,
  transitionWorkOrderStatus,
} from "@/lib/ai/tools/work-orders.server";

/**
 * Wrap an executor so a failing tool degrades to a rendered reason instead of
 * killing the stream. The model reads the reason and can pick another surface.
 */
function guarded<TInput, TOutput>(
  name: CoreToolName,
  execute: (ctx: CoreToolContext, input: TInput) => Promise<TOutput>,
  ctx: CoreToolContext,
  fallback: string,
) {
  return async (input: TInput) => {
    try {
      return await execute(ctx, input);
    } catch (error) {
      console.error(`[core-tool:${name}]`, error);
      return toolFailure(describeToolError(error, fallback));
    }
  };
}

/**
 * Build the tool set for one caller.
 *
 * Registration is **conditional on RBAC**: a tool the caller cannot use is
 * never put in the set, so the model cannot see it, call it, or hallucinate
 * that it did. Each executor re-checks its own scope as well — defence in depth
 * against a future refactor that loosens this function.
 *
 * The Admin SDK bypasses Firestore rules entirely, so these checks are the only
 * thing standing between a mechanic and the company ledger.
 */
export function buildCoreTools(ctx: CoreToolContext): ToolSet {
  const tools: ToolSet = {};

  if (ctx.scopes.inventory !== "none") {
    tools.searchInventory = tool({
      description:
        "Search warehouse stock by part name, SKU or brand. Returns on-hand and available quantities. Use before quoting any stock figure.",
      inputSchema: searchInventoryInput,
      execute: guarded("searchInventory", searchInventory, ctx, "Could not read inventory."),
    });

    tools.findStockLocation = tool({
      description:
        "Find which warehouse locations hold a given SKU, with the quantity in each.",
      inputSchema: findStockLocationInput,
      execute: guarded("findStockLocation", findStockLocation, ctx, "Could not read stock placements."),
    });

    tools.getWarehouseLocation = tool({
      description:
        "Read what is stored in one warehouse location, by location id, display code (e.g. A-3) or scanned barcode.",
      inputSchema: getWarehouseLocationInput,
      execute: guarded("getWarehouseLocation", getWarehouseLocation, ctx, "Could not read that location."),
    });
  }

  if (hasPermission(ctx.profile, "inventory_edit")) {
    tools.createInventoryItem = tool({
      description:
        "Create a new warehouse stock item. Use when the user asks to add a part/SKU. Requires barcode and name.",
      inputSchema: createInventoryItemInput,
      execute: guarded("createInventoryItem", createInventoryItem, ctx, "Could not create that item."),
    });

    tools.receiveStock = tool({
      description:
        "Receive stock (increase on-hand) for an existing itemId from searchInventory.",
      inputSchema: receiveStockInput,
      execute: guarded("receiveStock", receiveStock, ctx, "Could not receive stock."),
    });

    tools.relocateStock = tool({
      description:
        "Move stock to another warehouse cell. Prefer toLocationCode (e.g. A-3).",
      inputSchema: relocateStockInput,
      execute: guarded("relocateStock", relocateStock, ctx, "Could not relocate stock."),
    });

    tools.createEngine = tool({
      description:
        "Add one engine to inventory with brand, engine code and serial number. Use when the user asks to add, create, log or register an engine.",
      inputSchema: createEngineInput,
      execute: guarded("createEngine", createEngine, ctx, "Could not add that engine."),
    });

    tools.sellEngine = tool({
      description:
        "Mark an engine sold and optionally post a sale amount. Use motorId from searchEngines.",
      inputSchema: sellEngineInput,
      execute: guarded("sellEngine", sellEngine, ctx, "Could not sell that engine."),
    });
  }

  if (ctx.scopes.workOrders !== "none") {
    tools.listWorkOrders = tool({
      description:
        "List open work orders, optionally filtered by status. Results are limited to the caller's assigned orders when their role requires it.",
      inputSchema: listWorkOrdersInput,
      execute: guarded("listWorkOrders", listWorkOrders, ctx, "Could not read work orders."),
    });

    tools.getWorkOrder = tool({
      description:
        "Read one work order in full: client, vehicle, part lines, labor, totals and the statuses it can move to next.",
      inputSchema: getWorkOrderInput,
      execute: guarded("getWorkOrder", getWorkOrder, ctx, "Could not read that work order."),
    });
  }

  if (hasPermission(ctx.profile, "work_orders_edit")) {
    tools.createWorkOrder = tool({
      description:
        "Create a work order for a client and vehicle. Use when the user asks to open/create a job or repair order.",
      inputSchema: createWorkOrderInput,
      execute: guarded("createWorkOrder", createWorkOrder, ctx, "Could not create that work order."),
    });

    tools.transitionWorkOrderStatus = tool({
      description:
        "Move a work order to another status. Prefer a status from getWorkOrder.nextStatuses.",
      inputSchema: transitionWorkOrderStatusInput,
      execute: guarded(
        "transitionWorkOrderStatus",
        transitionWorkOrderStatus,
        ctx,
        "Could not change that work-order status.",
      ),
    });
  }

  if (hasPermission(ctx.profile, "work_orders_view")) {
    tools.ensureWorkOrderDocuments = tool({
      description:
        "Schedule / generate documents for a work order (Pro). Use after create or completion.",
      inputSchema: ensureWorkOrderDocumentsInput,
      execute: guarded(
        "ensureWorkOrderDocuments",
        ensureWorkOrderDocuments,
        ctx,
        "Could not generate documents.",
      ),
    });
  }

  if (hasPermission(ctx.profile, "clients_manage")) {
    tools.createClient = tool({
      description: "Create a customer record (name + phone). Use before or with createWorkOrder.",
      inputSchema: createClientInput,
      execute: guarded("createClient", createClient, ctx, "Could not create that customer."),
    });
  }

  if (ctx.scopes.motors !== "none") {
    tools.searchEngines = tool({
      description:
        "Search serialized engines and motors by brand, engine code, serial or free text. Handles loose spellings like 'bmw n54'.",
      inputSchema: searchEnginesInput,
      execute: guarded("searchEngines", searchEngines, ctx, "Could not read engines."),
    });
  }

  if (
    hasPermission(ctx.profile, "engine_intake_verify") ||
    hasPermission(ctx.profile, "engine_intake_execute")
  ) {
    tools.createEngineIntakeJob = tool({
      description:
        "Start the engine intake pipeline (photos/verify). Prefer createEngine for a direct inventory add without intake.",
      inputSchema: createEngineIntakeJobInput,
      execute: guarded(
        "createEngineIntakeJob",
        createEngineIntakeJob,
        ctx,
        "Could not start engine intake.",
      ),
    });
  }

  if (ctx.scopes.accounting === "company") {
    tools.getFinanceSummary = tool({
      description:
        "Income, expense and net totals for a recent period, with a daily series. Use for any question about revenue or spend.",
      inputSchema: getFinanceSummaryInput,
      execute: guarded("getFinanceSummary", getFinanceSummary, ctx, "Could not read accounting."),
    });
  }

  if (ctx.scopes.accounting === "company" && hasPermission(ctx.profile, "accounting_edit")) {
    tools.createAccountingOperation = tool({
      description:
        "Post an income or expense to company accounting. Use when the user asks to record money in/out.",
      inputSchema: createAccountingOperationInput,
      execute: guarded(
        "createAccountingOperation",
        createAccountingOperation,
        ctx,
        "Could not post that operation.",
      ),
    });
  }

  tools.navigateTo = tool({
    description:
      "Offer the user a button that opens an AutoCore surface. Use when the answer is 'go here', or alongside data you just read or wrote.",
    inputSchema: navigateToInput,
    execute: async (input) => {
      if (!isAllowedHref(input.href)) {
        return toolFailure(
          `"${input.href}" is not a route this app serves. Valid routes: ${allowedRouteList()}. ` +
            "Pick the closest one — do not invent another path.",
        );
      }
      return { ok: true as const, href: input.href, label: input.label, reason: input.reason };
    },
  });

  // Registered last so the closure sees the full RBAC-filtered set.
  tools.listCapabilities = tool({
    description:
      "List the tools available to this user right now. Call this first when they ask what you can do / что ты можешь.",
    inputSchema: listCapabilitiesInput,
    execute: async () => {
      const names = Object.keys(tools).filter((name) => name !== "listCapabilities") as CoreToolName[];
      return {
        ok: true as const,
        tools: names.map((name) => ({
          name,
          purpose: CORE_TOOL_PURPOSES[name] ?? name,
        })),
      };
    },
  });

  return tools;
}

/** Tool names registered for a caller — used by tests and diagnostics. */
export function registeredCoreToolNames(ctx: CoreToolContext): CoreToolName[] {
  return Object.keys(buildCoreTools(ctx)) as CoreToolName[];
}
