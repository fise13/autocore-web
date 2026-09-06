import { z } from "zod";

import { allowedHref, internalHref } from "@/domain/ai/internal-href";

/**
 * Input and output schemas for every Core tool.
 *
 * Deliberately free of `server-only` and of any executor: the client imports
 * `coreToolTypes` to derive `CoreUIMessage`, so the rendered message type stays
 * identical no matter which tools RBAC actually registers for a given user.
 * Executors live in `src/lib/ai/tools/*.server.ts`.
 */

/** Object vocabulary shared with the mobile AI workspace. */
export const assistantObjectTypes = [
  "engine",
  "order",
  "location",
  "part",
  "document",
  "operation",
] as const;

export type AssistantObjectType = (typeof assistantObjectTypes)[number];

const limit = z.number().int().min(1).max(20).default(10);

/** Every tool may fail gracefully — the UI renders a reason, never a stack. */
const softFailure = z.object({
  ok: z.literal(false),
  reason: z.string().max(300),
});

function result<T extends z.ZodTypeAny>(payload: T) {
  return z.union([payload.and(z.object({ ok: z.literal(true) })), softFailure]);
}

/* ------------------------------------------------------------------ inventory */

export const stockLineSchema = z.object({
  id: z.string(),
  sku: z.string(),
  name: z.string(),
  brandName: z.string().optional(),
  unit: z.string(),
  onHand: z.number(),
  available: z.number(),
  reserved: z.number(),
  lowStock: z.boolean(),
  href: internalHref,
});

export const searchInventoryInput = z.object({
  query: z.string().trim().min(1).max(120).describe("Part name, SKU or brand to look for"),
  lowStockOnly: z.boolean().optional().describe("Only return items at or below their low-stock threshold"),
  limit,
});

export const searchInventoryOutput = result(
  z.object({
    items: z.array(stockLineSchema),
    totalMatched: z.number(),
    truncated: z.boolean(),
    href: internalHref,
  }),
);

/* ------------------------------------------------------------- stock location */

export const findStockLocationInput = z.object({
  sku: z.string().trim().min(1).max(120).describe("SKU, barcode or exact item name"),
});

export const findStockLocationOutput = result(
  z.object({
    item: stockLineSchema,
    placements: z.array(
      z.object({
        locationId: z.string(),
        displayCode: z.string(),
        warehouseId: z.string(),
        quantity: z.number(),
        href: internalHref,
      }),
    ),
  }),
);

/* ---------------------------------------------------------------- work orders */

export const workOrderSummarySchema = z.object({
  id: z.string(),
  number: z.string(),
  status: z.string(),
  statusLabel: z.string(),
  clientId: z.string().optional(),
  clientName: z.string().optional(),
  clientPhone: z.string().optional(),
  vehicleLabel: z.string().optional(),
  licensePlate: z.string(),
  partLineCount: z.number(),
  laborLineCount: z.number(),
  grandTotal: z.number(),
  updatedAt: z.string(),
  assignedToMe: z.boolean(),
  href: internalHref,
});

export const listWorkOrdersInput = z.object({
  status: z.string().trim().max(40).optional().describe("Filter by work-order status"),
  mineOnly: z.boolean().optional().describe("Only orders assigned to the current user"),
  includeClosed: z
    .boolean()
    .optional()
    .describe("Include completed and delivered jobs. Use for last client / last purchase."),
  limit,
});

export const listWorkOrdersOutput = result(
  z.object({
    orders: z.array(workOrderSummarySchema),
    totalMatched: z.number(),
    /** True when row-level RBAC narrowed the result to assigned orders. */
    scopeLimited: z.boolean(),
    href: internalHref,
  }),
);

export const getWorkOrderInput = z.object({
  workOrderId: z.string().trim().min(1).max(120),
});

export const getWorkOrderOutput = result(
  z.object({
    order: workOrderSummarySchema.extend({
      clientPhone: z.string().optional(),
      vin: z.string(),
      mileage: z.number(),
      comment: z.string().optional(),
      partLines: z.array(
        z.object({
          id: z.string(),
          name: z.string(),
          sku: z.string().optional(),
          quantity: z.number(),
          unitPrice: z.number(),
        }),
      ),
      laborTitles: z.array(z.string()),
      nextStatuses: z.array(z.object({ status: z.string(), label: z.string() })),
    }),
  }),
);

/* -------------------------------------------------------------------- engines */

export const engineSummarySchema = z.object({
  id: z.string(),
  localId: z.number().optional(),
  serialCode: z.string(),
  brandName: z.string().optional(),
  engineCode: z.string().optional(),
  configuration: z.string().optional(),
  transmission: z.string().optional(),
  status: z.string().optional(),
  quality: z.string().optional(),
  locationCode: z.string().optional(),
  quantity: z.number(),
  href: internalHref,
});

export const searchEnginesInput = z.object({
  query: z.string().trim().min(1).max(120).describe("Brand, engine code, serial or free text"),
  status: z.string().trim().max(40).optional().describe("Filter by motor status, e.g. available"),
  limit,
});

export const searchEnginesOutput = result(
  z.object({
    engines: z.array(engineSummarySchema),
    totalMatched: z.number(),
    truncated: z.boolean(),
    /** Canonical brand/engine the query resolved to, when the fuzzy matcher hit. */
    resolvedTerm: z.string().optional(),
    href: internalHref,
  }),
);

export const createEngineInput = z.object({
  brandName: z.string().trim().min(1).max(80).describe("Brand, e.g. Subaru"),
  engineCode: z.string().trim().min(1).max(80).describe("Engine code, e.g. EJ251"),
  serialCode: z
    .string()
    .trim()
    .min(1)
    .max(80)
    .describe("Unique serial / inventory number for this engine"),
  notes: z.string().trim().max(500).optional().describe("Optional short note"),
});

export const createEngineOutput = result(
  z.object({
    engine: engineSummarySchema,
    created: z.literal(true),
    href: internalHref,
  }),
);

/* -------------------------------------------------------------------- finance */

export const getFinanceSummaryInput = z.object({
  periodDays: z.number().int().min(1).max(90).default(30).describe("Look-back window in days"),
});

export const getFinanceSummaryOutput = result(
  z.object({
    periodDays: z.number(),
    currency: z.string(),
    income: z.number(),
    expense: z.number(),
    net: z.number(),
    operationCount: z.number(),
    /** Daily net revenue for a sparkline, oldest first. */
    series: z.array(z.object({ date: z.string(), value: z.number() })),
    /** True when the 500-doc read cap was hit, so totals are a partial window. */
    truncated: z.boolean(),
    href: internalHref,
  }),
);

/* ------------------------------------------------------------------- location */

export const getWarehouseLocationInput = z.object({
  locationId: z.string().trim().min(1).max(120).describe("Location id or scanned barcode"),
});

export const getWarehouseLocationOutput = result(
  z.object({
    location: z.object({
      id: z.string(),
      displayCode: z.string(),
      label: z.string().optional(),
      type: z.string(),
      warehouseId: z.string(),
      href: internalHref,
    }),
    occupancy: z.object({
      lineCount: z.number(),
      totalOnHand: z.number(),
      totalAvailable: z.number(),
      engineCount: z.number(),
    }),
    items: z.array(
      z.object({
        kind: z.enum(["part", "motor", "specific"]),
        id: z.string(),
        title: z.string(),
        subtitle: z.string().optional(),
        quantity: z.number(),
        sku: z.string().optional(),
        serialCode: z.string().optional(),
      }),
    ),
  }),
);

/* ----------------------------------------------------------- inventory writes */

export const createInventoryItemInput = z.object({
  name: z.string().trim().min(1).max(160).describe("Part display name"),
  barcode: z.string().trim().min(1).max(80).describe("Barcode or unique scan code"),
  sku: z.string().trim().max(80).optional().describe("SKU / article; defaults from barcode"),
  brandName: z.string().trim().max(80).optional(),
  unit: z.string().trim().max(20).optional().describe("Unit, default pcs"),
  sellPrice: z.number().nonnegative().optional(),
  purchasePrice: z.number().nonnegative().optional(),
  initialQuantity: z.number().int().nonnegative().optional().describe("Receive this many on create"),
  warehouseLocation: z.string().trim().max(80).optional().describe("Shelf / cell code"),
});

export const createInventoryItemOutput = result(
  z.object({
    itemId: z.string(),
    sku: z.string(),
    name: z.string(),
    barcode: z.string(),
    href: internalHref,
  }),
);

export const receiveStockInput = z.object({
  itemId: z.string().trim().min(1).max(120).describe("Inventory item id from searchInventory"),
  quantity: z.number().int().positive().max(100_000),
  unitCost: z.number().nonnegative().optional(),
  warehouseId: z.string().trim().max(120).optional(),
});

export const receiveStockOutput = result(
  z.object({
    itemId: z.string(),
    quantity: z.number(),
    onHand: z.number(),
    available: z.number(),
    movementId: z.string(),
    href: internalHref,
  }),
);

export const relocateStockInput = z.object({
  itemId: z.string().trim().min(1).max(120),
  toLocationCode: z.string().trim().max(80).optional().describe("Destination cell code, e.g. A-3"),
  toLocationId: z.string().trim().max(120).optional().describe("Destination location id"),
  fromLocationId: z.string().trim().max(120).optional(),
  quantity: z.number().int().positive().max(100_000).optional().describe("Omit to move all available"),
  warehouseId: z.string().trim().max(120).optional(),
});

export const relocateStockOutput = result(
  z.object({
    itemId: z.string(),
    quantity: z.number(),
    toLocationCode: z.string(),
    movementId: z.string(),
    href: internalHref,
  }),
);

/* --------------------------------------------------------- work order writes */

export const transitionWorkOrderStatusInput = z.object({
  workOrderId: z.string().trim().min(1).max(120),
  status: z
    .enum([
      "draft",
      "confirmed",
      "in_progress",
      "waiting_parts",
      "completed",
      "delivered",
      "cancelled",
    ])
    .describe("Target status; prefer one from getWorkOrder.nextStatuses"),
});

export const transitionWorkOrderStatusOutput = result(
  z.object({
    order: workOrderSummarySchema,
    documentJobId: z.string().optional(),
  }),
);

export const createWorkOrderInput = z.object({
  clientName: z
    .string()
    .trim()
    .min(2)
    .max(120)
    .optional()
    .describe("Required unless sourceWorkOrderId is set"),
  clientPhone: z
    .string()
    .trim()
    .min(3)
    .max(40)
    .optional()
    .describe("Required unless sourceWorkOrderId is set"),
  sourceWorkOrderId: z
    .string()
    .trim()
    .min(1)
    .max(120)
    .optional()
    .describe(
      "Clone client, vehicle, parts and labor from this work order. Use for last client / same as last job.",
    ),
  licensePlate: z.string().trim().max(40).optional().default(""),
  vin: z.string().trim().max(40).optional().default(""),
  vehicleMake: z.string().trim().max(60).optional().default(""),
  vehicleModel: z.string().trim().max(60).optional().default(""),
  mileage: z.number().int().nonnegative().optional().default(0),
  comment: z.string().trim().max(500).optional(),
  laborTitle: z.string().trim().max(160).optional().describe("Optional first labor line title"),
});

export const createWorkOrderOutput = result(
  z.object({
    order: workOrderSummarySchema,
    clientId: z.string(),
    vehicleId: z.string(),
  }),
);

export const createClientInput = z.object({
  fullName: z.string().trim().min(2).max(120),
  phone: z.string().trim().min(3).max(40),
  email: z.string().trim().email().max(160).optional().or(z.literal("")),
  notes: z.string().trim().max(500).optional(),
});

export const createClientOutput = result(
  z.object({
    clientId: z.string(),
    fullName: z.string(),
    phone: z.string(),
    href: internalHref,
  }),
);

export const searchClientsInput = z.object({
  query: z
    .string()
    .trim()
    .max(80)
    .optional()
    .describe("Name or phone. Empty returns the most recent customers."),
  limit,
});

export const searchClientsOutput = result(
  z.object({
    clients: z.array(
      z.object({
        id: z.string(),
        fullName: z.string(),
        phone: z.string(),
        lastWorkOrderId: z.string().optional(),
        lastWorkOrderNumber: z.string().optional(),
        href: internalHref,
      }),
    ),
    totalMatched: z.number(),
    href: internalHref,
  }),
);

export const ensureWorkOrderDocumentsInput = z.object({
  workOrderId: z.string().trim().min(1).max(120),
});

export const ensureWorkOrderDocumentsOutput = result(
  z.object({
    workOrderId: z.string(),
    jobId: z.string().optional(),
    slugs: z.array(z.string()),
    href: internalHref,
  }),
);

/* --------------------------------------------------------------- engine writes */

export const sellEngineInput = z.object({
  motorId: z.string().trim().min(1).max(120).describe("Engine id from searchEngines"),
  amount: z.number().nonnegative().describe("Sale amount; 0 marks sold without a ledger line"),
  account: z.enum(["cashbox", "kaspi"]).default("cashbox"),
  paymentMethod: z.enum(["cash", "transfer", "mixed"]).default("cash"),
  comment: z.string().trim().max(300).optional(),
});

export const sellEngineOutput = result(
  z.object({
    engine: engineSummarySchema,
    operationId: z.string().nullable(),
    href: internalHref,
  }),
);

export const createEngineIntakeJobInput = z.object({
  serialCode: z.string().trim().min(1).max(80),
  brandName: z.string().trim().max(80).optional(),
  engineCode: z.string().trim().max(80).optional(),
  source: z.enum(["dismantle", "purchase", "transfer", "ad_hoc"]).default("ad_hoc"),
});

export const createEngineIntakeJobOutput = result(
  z.object({
    jobId: z.string(),
    engineId: z.string(),
    href: internalHref,
  }),
);

/* ------------------------------------------------------------- finance writes */

export const createAccountingOperationInput = z.object({
  type: z.enum(["income", "expense"]),
  amount: z.number().positive(),
  account: z.enum(["cashbox", "kaspi"]).default("cashbox"),
  paymentMethod: z.enum(["cash", "transfer", "mixed"]).default("cash"),
  category: z.string().trim().max(80).optional(),
  comment: z.string().trim().max(300).optional(),
});

export const createAccountingOperationOutput = result(
  z.object({
    operationId: z.string(),
    type: z.enum(["income", "expense"]),
    amount: z.number(),
    href: internalHref,
  }),
);

/* ---------------------------------------------------------------- capabilities */

export const listCapabilitiesInput = z.object({}).describe("No arguments");

export const listCapabilitiesOutput = result(
  z.object({
    tools: z.array(
      z.object({
        name: z.string(),
        purpose: z.string(),
      }),
    ),
  }),
);

/* ------------------------------------------------------------------ navigation */

export const navigateToInput = z.object({
  href: z.string().trim().min(1).max(300).describe("Internal AutoCore path, must start with /"),
  label: z.string().trim().min(1).max(60).describe("Button label, e.g. 'Open work orders'"),
  reason: z.string().trim().max(160).optional().describe("One short line on why this surface helps"),
});

export const navigateToOutput = result(
  z.object({
    href: allowedHref,
    label: z.string(),
    reason: z.string().optional(),
  }),
);

/* -------------------------------------------------------------------- guides */

export const showGuideInput = z.object({
  guideId: z
    .string()
    .trim()
    .min(1)
    .max(80)
    .describe("Interactive walkthrough id, e.g. create-work-order or invite-team-member"),
});

export const showGuideOutput = result(
  z.object({
    guideId: z.string(),
    title: z.string(),
    summary: z.string(),
  }),
);

const briefingMetric = z.object({
  id: z.enum(["lowStock", "openWorkOrders", "enginesAvailable", "financeNet7d"]),
  value: z.string(),
  tone: z.enum(["default", "attention"]),
});

const briefingAttention = z.object({
  id: z.enum(["lowStock", "openWorkOrders", "negativeNet", "noEngines"]),
  count: z.number().optional(),
});

export const getShiftBriefingInput = z.object({}).describe("No arguments");

export const getShiftBriefingOutput = result(
  z.object({
    companyName: z.string(),
    compiledAt: z.string(),
    stale: z.boolean(),
    attention: z.array(briefingAttention),
    pulse: z.array(briefingMetric),
    askPrompt: z.string(),
    href: internalHref,
  }),
);

export const recallCompanyKnowledgeInput = z.object({
  engineCode: z.string().trim().max(80).optional().describe("Engine code, e.g. EJ251"),
  brandName: z.string().trim().max(80).optional(),
  clientId: z.string().trim().max(120).optional(),
  mechanicId: z.string().trim().max(120).optional(),
  query: z.string().trim().max(120).optional().describe("Part, SKU or free-text habit lookup"),
  skus: z.array(z.string().trim().min(1).max(80)).max(12).optional(),
  limit: z.number().int().min(1).max(20).default(8),
});

export const recallCompanyKnowledgeOutput = result(
  z.object({
    suggestions: z.array(
      z.object({
        title: z.string(),
        explanation: z.string(),
        kind: z.string(),
        confidence: z.number(),
        support: z.number(),
      }),
    ),
  }),
);

export const rememberCompanyFactInput = z.object({
  text: z
    .string()
    .trim()
    .min(1)
    .max(2000)
    .describe("A company rule or fact to remember, in the owner's words"),
  tags: z.array(z.string().trim().min(1).max(40)).max(8).optional(),
});

export const rememberCompanyFactOutput = result(
  z.object({
    memoryId: z.string(),
    text: z.string(),
  }),
);

export const forgetCompanyFactInput = z.object({
  memoryId: z.string().trim().min(1).max(120),
});

export const forgetCompanyFactOutput = result(
  z.object({
    memoryId: z.string(),
  }),
);

/* ------------------------------------------------------------------- registry */

/**
 * Type-only mirror of the tool set.
 *
 * `InferUITools<typeof coreToolTypes>` gives the client the exact part types
 * (`tool-searchEngines`, …) with typed input/output, without importing a single
 * server module. `validateUIMessages` on the route uses the same object to
 * reject tampered message history.
 */
export const coreToolTypes = {
  listCapabilities: { inputSchema: listCapabilitiesInput, outputSchema: listCapabilitiesOutput },
  searchInventory: { inputSchema: searchInventoryInput, outputSchema: searchInventoryOutput },
  findStockLocation: { inputSchema: findStockLocationInput, outputSchema: findStockLocationOutput },
  getWarehouseLocation: {
    inputSchema: getWarehouseLocationInput,
    outputSchema: getWarehouseLocationOutput,
  },
  createInventoryItem: {
    inputSchema: createInventoryItemInput,
    outputSchema: createInventoryItemOutput,
  },
  receiveStock: { inputSchema: receiveStockInput, outputSchema: receiveStockOutput },
  relocateStock: { inputSchema: relocateStockInput, outputSchema: relocateStockOutput },
  listWorkOrders: { inputSchema: listWorkOrdersInput, outputSchema: listWorkOrdersOutput },
  getWorkOrder: { inputSchema: getWorkOrderInput, outputSchema: getWorkOrderOutput },
  createWorkOrder: { inputSchema: createWorkOrderInput, outputSchema: createWorkOrderOutput },
  transitionWorkOrderStatus: {
    inputSchema: transitionWorkOrderStatusInput,
    outputSchema: transitionWorkOrderStatusOutput,
  },
  ensureWorkOrderDocuments: {
    inputSchema: ensureWorkOrderDocumentsInput,
    outputSchema: ensureWorkOrderDocumentsOutput,
  },
  createClient: { inputSchema: createClientInput, outputSchema: createClientOutput },
  searchClients: { inputSchema: searchClientsInput, outputSchema: searchClientsOutput },
  searchEngines: { inputSchema: searchEnginesInput, outputSchema: searchEnginesOutput },
  createEngine: { inputSchema: createEngineInput, outputSchema: createEngineOutput },
  sellEngine: { inputSchema: sellEngineInput, outputSchema: sellEngineOutput },
  createEngineIntakeJob: {
    inputSchema: createEngineIntakeJobInput,
    outputSchema: createEngineIntakeJobOutput,
  },
  getFinanceSummary: { inputSchema: getFinanceSummaryInput, outputSchema: getFinanceSummaryOutput },
  createAccountingOperation: {
    inputSchema: createAccountingOperationInput,
    outputSchema: createAccountingOperationOutput,
  },
  navigateTo: { inputSchema: navigateToInput, outputSchema: navigateToOutput },
  showGuide: { inputSchema: showGuideInput, outputSchema: showGuideOutput },
  getShiftBriefing: { inputSchema: getShiftBriefingInput, outputSchema: getShiftBriefingOutput },
  recallCompanyKnowledge: {
    inputSchema: recallCompanyKnowledgeInput,
    outputSchema: recallCompanyKnowledgeOutput,
  },
  rememberCompanyFact: {
    inputSchema: rememberCompanyFactInput,
    outputSchema: rememberCompanyFactOutput,
  },
  forgetCompanyFact: { inputSchema: forgetCompanyFactInput, outputSchema: forgetCompanyFactOutput },
} as const;

export type CoreToolName = keyof typeof coreToolTypes;

export const CORE_TOOL_NAMES = Object.keys(coreToolTypes) as CoreToolName[];

export type StockLine = z.infer<typeof stockLineSchema>;
export type WorkOrderSummaryPart = z.infer<typeof workOrderSummarySchema>;
export type EngineSummaryPart = z.infer<typeof engineSummarySchema>;
export type SearchInventoryOutput = z.infer<typeof searchInventoryOutput>;
export type FindStockLocationOutput = z.infer<typeof findStockLocationOutput>;
export type ListWorkOrdersOutput = z.infer<typeof listWorkOrdersOutput>;
export type GetWorkOrderOutput = z.infer<typeof getWorkOrderOutput>;
export type SearchEnginesOutput = z.infer<typeof searchEnginesOutput>;
export type CreateEngineOutput = z.infer<typeof createEngineOutput>;
export type GetFinanceSummaryOutput = z.infer<typeof getFinanceSummaryOutput>;
export type GetWarehouseLocationOutput = z.infer<typeof getWarehouseLocationOutput>;
export type NavigateToOutput = z.infer<typeof navigateToOutput>;
export type ShowGuideOutput = z.infer<typeof showGuideOutput>;
export type ListCapabilitiesOutput = z.infer<typeof listCapabilitiesOutput>;
export type CreateInventoryItemOutput = z.infer<typeof createInventoryItemOutput>;
export type ReceiveStockOutput = z.infer<typeof receiveStockOutput>;
export type RelocateStockOutput = z.infer<typeof relocateStockOutput>;
export type TransitionWorkOrderStatusOutput = z.infer<typeof transitionWorkOrderStatusOutput>;
export type CreateWorkOrderOutput = z.infer<typeof createWorkOrderOutput>;
export type CreateClientOutput = z.infer<typeof createClientOutput>;
export type SearchClientsOutput = z.infer<typeof searchClientsOutput>;
export type EnsureWorkOrderDocumentsOutput = z.infer<typeof ensureWorkOrderDocumentsOutput>;
export type SellEngineOutput = z.infer<typeof sellEngineOutput>;
export type CreateEngineIntakeJobOutput = z.infer<typeof createEngineIntakeJobOutput>;
export type CreateAccountingOperationOutput = z.infer<typeof createAccountingOperationOutput>;
export type GetShiftBriefingOutput = z.infer<typeof getShiftBriefingOutput>;
export type RecallCompanyKnowledgeOutput = z.infer<typeof recallCompanyKnowledgeOutput>;
export type RememberCompanyFactOutput = z.infer<typeof rememberCompanyFactOutput>;
export type ForgetCompanyFactOutput = z.infer<typeof forgetCompanyFactOutput>;
