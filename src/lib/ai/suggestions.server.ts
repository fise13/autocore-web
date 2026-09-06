import "server-only";

import { getAdminFirestore } from "@/infrastructure/firebase/admin";
import type { CoreSuggestion } from "@/domain/ai/suggestions";
import type { CoreToolContext } from "@/lib/ai/tools/context";
import type { AssistantContext } from "@/lib/ai/assistant-context";
import { readCompanyPulse } from "@/lib/ai/company-pulse.server";

export type { CoreSuggestion };

function formatNetHint(net: number, currency: string): string {
  return `${net < 0 ? "−" : ""}${Math.abs(Math.round(net)).toLocaleString("en-US")} ${currency} / 7d`;
}

/** Ordering by where the user actually is, so the local surface leads. */
const AREA_PRIORITY: Partial<Record<AssistantContext["areaId"], string>> = {
  finance: "finance",
  earnings: "finance",
  warehouse: "inventory",
  engines: "engines",
  sales: "engines",
  work_orders: "workOrders",
  customers: "workOrders",
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
  const pulse = await readCompanyPulse(ctx);
  const groups: { key: string; items: CoreSuggestion[] }[] = [];

  if (pulse.financeNet7d != null) {
    const currency = pulse.financeCurrency ?? "USD";
    groups.push({
      key: "finance",
      items: [
        {
          prompt: "What is our profit over the last 30 days?",
          label: "Profit this month",
          hint: formatNetHint(pulse.financeNet7d, currency),
          tone: pulse.financeNet7d < 0 ? "attention" : "default",
        },
      ],
    });
  }

  if (pulse.lowStockCount != null && pulse.lowStockCount > 0) {
    groups.push({
      key: "inventory",
      items: [
        {
          prompt: "Which parts are below their reorder point?",
          label: "Parts below reorder point",
          hint: `${pulse.lowStockCount}${pulse.lowStockTruncated ? "+" : ""}`,
          tone: "attention",
        },
      ],
    });
  }

  if (pulse.openWorkOrderCount != null && pulse.openWorkOrderCount > 0) {
    const mineOnly = ctx.scopes.workOrders === "assigned_work_orders";
    groups.push({
      key: "workOrders",
      items: [
        {
          prompt: mineOnly ? "What work orders are assigned to me?" : "What work orders are open?",
          label: mineOnly ? "My work orders" : "Open work orders",
          hint: `${pulse.openWorkOrderCount}`,
        },
      ],
    });
  }

  if (pulse.enginesAvailable != null && pulse.enginesAvailable > 0) {
    groups.push({
      key: "engines",
      items: [
        {
          prompt: "Which engines are available right now?",
          label: "Engines in stock",
          hint: `${pulse.enginesAvailable}${pulse.enginesTruncated ? "+" : ""}`,
        },
      ],
    });
  }

  const preferred = AREA_PRIORITY[context.areaId];
  const ordered = preferred
    ? [...groups].sort((a, b) => Number(b.key === preferred) - Number(a.key === preferred))
    : groups;

  return ordered.flatMap((group) => group.items).slice(0, 4);
}
