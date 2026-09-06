import "server-only";

import { getAdminFirestore } from "@/infrastructure/firebase/admin";
import { TOP_LEVEL_COLLECTIONS } from "@/infrastructure/firestore/collections";
import { normalizeCompanyId } from "@/lib/company-id";
import { emptyCompanyPulse, type CompanyPulse } from "@/domain/ai/company-brain";
import type { CoreToolContext } from "@/lib/ai/tools/context";
import { listMobileWorkOrders } from "@/lib/mobile/work-orders.server";

/** Same window Core suggestions already used — inventory has no substring search. */
export const COMPANY_PULSE_READ_CAP = 200;

type PulseReader = Pick<CoreToolContext, "companyId" | "uid" | "scopes">;

function toDate(value: unknown): Date | null {
  if (value && typeof value === "object" && "toDate" in value && typeof value.toDate === "function") {
    return (value as { toDate: () => Date }).toDate();
  }
  return value instanceof Date ? value : null;
}

async function readLowStock(ctx: PulseReader): Promise<Pick<CompanyPulse, "lowStockCount" | "lowStockTruncated">> {
  if (ctx.scopes.inventory === "none") {
    return { lowStockCount: null, lowStockTruncated: false };
  }

  const snapshot = await getAdminFirestore()
    .collection(TOP_LEVEL_COLLECTIONS.inventoryItems)
    .where("companyId", "==", normalizeCompanyId(ctx.companyId))
    .orderBy("updatedAt", "desc")
    .limit(COMPANY_PULSE_READ_CAP)
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

  return {
    lowStockCount: low,
    lowStockTruncated: snapshot.size >= COMPANY_PULSE_READ_CAP,
  };
}

async function readOpenWorkOrders(ctx: PulseReader): Promise<Pick<CompanyPulse, "openWorkOrderCount">> {
  if (ctx.scopes.workOrders === "none") {
    return { openWorkOrderCount: null };
  }

  const orders = await listMobileWorkOrders({
    companyId: ctx.companyId,
    uid: ctx.uid,
    mineOnly: ctx.scopes.workOrders === "assigned_work_orders",
  });
  return { openWorkOrderCount: orders.length };
}

async function readFinance(ctx: PulseReader): Promise<
  Pick<CompanyPulse, "financeNet7d" | "financeCurrency" | "financeTruncated">
> {
  if (ctx.scopes.accounting !== "company") {
    return { financeNet7d: null, financeCurrency: null, financeTruncated: false };
  }

  const since = new Date();
  since.setDate(since.getDate() - 7);
  since.setHours(0, 0, 0, 0);

  const snapshot = await getAdminFirestore()
    .collection(TOP_LEVEL_COLLECTIONS.financialOperations)
    .where("companyId", "==", normalizeCompanyId(ctx.companyId))
    .where("createdAt", ">=", since)
    .orderBy("createdAt", "desc")
    .limit(COMPANY_PULSE_READ_CAP)
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

  return {
    financeNet7d: net,
    financeCurrency: currency,
    financeTruncated: snapshot.size >= COMPANY_PULSE_READ_CAP,
  };
}

async function readEngines(ctx: PulseReader): Promise<Pick<CompanyPulse, "enginesAvailable" | "enginesTruncated">> {
  if (ctx.scopes.motors === "none") {
    return { enginesAvailable: null, enginesTruncated: false };
  }

  const snapshot = await getAdminFirestore()
    .collectionGroup(TOP_LEVEL_COLLECTIONS.motors)
    .where("companyId", "==", normalizeCompanyId(ctx.companyId))
    .limit(COMPANY_PULSE_READ_CAP)
    .get();

  let available = 0;
  for (const doc of snapshot.docs) {
    const data = doc.data() as Record<string, unknown>;
    if (data.deletedAt) continue;
    if (String(data.status ?? "available") === "available") available += 1;
  }

  return {
    enginesAvailable: available,
    enginesTruncated: snapshot.size >= COMPANY_PULSE_READ_CAP,
  };
}

/**
 * Live shop pulse for Core's company brain and empty-state chips.
 *
 * Each group fails closed: a permission miss or a thrown read leaves that
 * field null rather than failing the whole snapshot.
 */
export async function readCompanyPulse(ctx: PulseReader): Promise<CompanyPulse> {
  const pulse = emptyCompanyPulse();

  const groups = await Promise.all([
    readLowStock(ctx).catch((error) => {
      console.error("[company-pulse:inventory]", error);
      return { lowStockCount: null, lowStockTruncated: false };
    }),
    readOpenWorkOrders(ctx).catch((error) => {
      console.error("[company-pulse:workOrders]", error);
      return { openWorkOrderCount: null };
    }),
    readFinance(ctx).catch((error) => {
      console.error("[company-pulse:finance]", error);
      return { financeNet7d: null, financeCurrency: null, financeTruncated: false };
    }),
    readEngines(ctx).catch((error) => {
      console.error("[company-pulse:engines]", error);
      return { enginesAvailable: null, enginesTruncated: false };
    }),
  ]);

  return { ...pulse, ...groups[0], ...groups[1], ...groups[2], ...groups[3] };
}
