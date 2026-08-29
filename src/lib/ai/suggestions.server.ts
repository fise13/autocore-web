import "server-only";

import { getAdminFirestore } from "@/infrastructure/firebase/admin";
import { TOP_LEVEL_COLLECTIONS } from "@/infrastructure/firestore/collections";
import { normalizeCompanyId } from "@/lib/company-id";
import type { CoreToolContext } from "@/lib/ai/tools/context";
import type { AssistantContext } from "@/lib/ai/assistant-context";
import type { CoreSuggestion } from "@/domain/ai/suggestions";
import { listMobileWorkOrders } from "@/lib/mobile/work-orders.server";

export type { CoreSuggestion };

const READ_CAP = 200;

function toDate(value: unknown): Date | null {
  if (value && typeof value === "object" && "toDate" in value && typeof value.toDate === "function") {
    return (value as { toDate: () => Date }).toDate();
  }
  return value instanceof Date ? value : null;
}

async function inventorySuggestions(ctx: CoreToolContext): Promise<CoreSuggestion[]> {
  if (ctx.scopes.inventory === "none") return [];

  const snapshot = await getAdminFirestore()
    .collection(TOP_LEVEL_COLLECTIONS.inventoryItems)
    .where("companyId", "==", normalizeCompanyId(ctx.companyId))
    .orderBy("updatedAt", "desc")
    .limit(READ_CAP)
    .get();

  let low = 0;
  for (const doc of snapshot.docs) {
    const data = doc.data() as Record<string, unknown>;
    if (String(data.status ?? "active") !== "active") continue;
    const onHand = Number(data.totalOnHand ?? data.quantity ?? 0);
    const available = Number(data.totalAvailable ?? onHand);
    const threshold = Number(data.lowStockThreshold ?? 1);
    if (Number.isFinite(available) && available <= threshold) low += 1;
  }

  if (low === 0) return [];
  return [
    {
      prompt: "Which parts are below their reorder point?",
      label: "Parts below reorder point",
      hint: `${low}${snapshot.size >= READ_CAP ? "+" : ""}`,
      tone: "attention",
    },
  ];
}

async function workOrderSuggestions(ctx: CoreToolContext): Promise<CoreSuggestion[]> {
  if (ctx.scopes.workOrders === "none") return [];

  const mineOnly = ctx.scopes.workOrders === "assigned_work_orders";
  const orders = await listMobileWorkOrders({
    companyId: ctx.companyId,
    uid: ctx.uid,
    mineOnly,
  });
  if (orders.length === 0) return [];

  return [
    {
      prompt: mineOnly ? "What work orders are assigned to me?" : "What work orders are open?",
      label: mineOnly ? "My work orders" : "Open work orders",
      hint: `${orders.length}`,
    },
  ];
}

async function financeSuggestions(ctx: CoreToolContext): Promise<CoreSuggestion[]> {
  if (ctx.scopes.accounting !== "company") return [];

  const since = new Date();
  since.setDate(since.getDate() - 7);
  since.setHours(0, 0, 0, 0);

  const snapshot = await getAdminFirestore()
    .collection(TOP_LEVEL_COLLECTIONS.financialOperations)
    .where("companyId", "==", normalizeCompanyId(ctx.companyId))
    .where("createdAt", ">=", since)
    .orderBy("createdAt", "desc")
    .limit(READ_CAP)
    .get();

  let net = 0;
  let currency = "USD";
  for (const doc of snapshot.docs) {
    const data = doc.data() as Record<string, unknown>;
    const amount = Number(data.amount);
    if (!Number.isFinite(amount) || !toDate(data.createdAt)) continue;
    if (typeof data.currency === "string" && data.currency.trim()) currency = data.currency.trim();
    const type = String(data.type ?? "");
    if (type === "income" || type === "sale") net += amount;
    else if (type === "expense" || type === "refund") net -= amount;
  }

  const suggestions: CoreSuggestion[] = [
    {
      prompt: "What is our profit over the last 30 days?",
      label: "Profit this month",
    },
  ];

  if (snapshot.size > 0) {
    suggestions[0]!.hint = `${net < 0 ? "−" : ""}${Math.abs(Math.round(net)).toLocaleString("en-US")} ${currency} / 7d`;
    if (net < 0) suggestions[0]!.tone = "attention";
  }

  return suggestions;
}

async function engineSuggestions(ctx: CoreToolContext): Promise<CoreSuggestion[]> {
  if (ctx.scopes.motors === "none") return [];

  const snapshot = await getAdminFirestore()
    .collectionGroup(TOP_LEVEL_COLLECTIONS.motors)
    .where("companyId", "==", normalizeCompanyId(ctx.companyId))
    .limit(READ_CAP)
    .get();

  let available = 0;
  for (const doc of snapshot.docs) {
    const data = doc.data() as Record<string, unknown>;
    if (data.deletedAt) continue;
    if (String(data.status ?? "available") === "available") available += 1;
  }

  if (available === 0) return [];
  return [
    {
      prompt: "Which engines are available right now?",
      label: "Engines in stock",
      hint: `${available}${snapshot.size >= READ_CAP ? "+" : ""}`,
    },
  ];
}

/** Ordering by where the user actually is, so the local surface leads. */
const AREA_PRIORITY: Partial<Record<AssistantContext["areaId"], string>> = {
  finance: "finance",
  earnings: "finance",
  warehouse: "inventory",
  engines: "engines",
  sales: "engines",
  work_orders: "workOrders",
};

/**
 * Build the Core empty-state chips from live company data.
 *
 * Every read is RBAC-gated and bounded, and a failing group is dropped rather
 * than failing the request — an empty-state must never be the reason a screen
 * errors. Callers fall back to the static area suggestions when this returns
 * nothing.
 */
export async function buildCoreSuggestions(
  ctx: CoreToolContext,
  context: AssistantContext,
): Promise<CoreSuggestion[]> {
  const groups = await Promise.all(
    (
      [
        ["finance", financeSuggestions],
        ["inventory", inventorySuggestions],
        ["workOrders", workOrderSuggestions],
        ["engines", engineSuggestions],
      ] as const
    ).map(async ([key, run]) => {
      try {
        return { key, items: await run(ctx) };
      } catch (error) {
        console.error(`[core-suggestions:${key}]`, error);
        return { key, items: [] as CoreSuggestion[] };
      }
    }),
  );

  const preferred = AREA_PRIORITY[context.areaId];
  const ordered = preferred
    ? [...groups].sort((a, b) => Number(b.key === preferred) - Number(a.key === preferred))
    : groups;

  return ordered.flatMap((group) => group.items).slice(0, 4);
}
