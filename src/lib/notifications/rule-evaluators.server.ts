import "server-only";

import type { NotificationEventContext } from "@/domain/notifications";
import { compileCompanyBrain } from "@/lib/ai/company-brain.server";
import { emitNotificationEvent } from "@/lib/notifications/engine.server";
import { getAdminFirestore } from "@/infrastructure/firebase/admin";
import { normalizeCompanyId } from "@/lib/company-id";
import { mapAdminWorkOrder } from "@/infrastructure/firestore/admin-mappers";

/** Evening job: notify managers about work orders left open after hours. */
export async function evaluateOpenWorkOrdersRule(companyId: string): Promise<void> {
  const db = getAdminFirestore();
  const normalized = normalizeCompanyId(companyId);
  const snap = await db
    .collection("companies")
    .doc(normalized)
    .collection("workOrders")
    .where("status", "in", ["confirmed", "in_progress", "waiting_parts"])
    .limit(100)
    .get();

  if (snap.empty) return;

  const openCount = snap.size;
  const ctx: NotificationEventContext = {
    companyId: normalized,
    eventType: "work_order.left_open",
    payload: {
      summary: `${openCount} нарядов остаются открытыми после рабочего дня`,
      openCount,
    },
  };

  await emitNotificationEvent(ctx);
}

/** Hourly job: flag overdue invoices (placeholder until invoice module wired). */
export async function evaluateOverdueInvoicesRule(companyId: string): Promise<void> {
  const db = getAdminFirestore();
  const normalized = normalizeCompanyId(companyId);
  const snap = await db
    .collection("companies")
    .doc(normalized)
    .collection("financialOperations")
    .where("status", "==", "overdue")
    .limit(20)
    .get();

  if (snap.empty) return;

  await emitNotificationEvent({
    companyId: normalized,
    eventType: "invoice.overdue",
    payload: {
      summary: `${snap.size} просроченных операций`,
      count: snap.size,
    },
  });
}

/** Morning job: warranties expiring within 24h. */
export async function evaluateExpiringWarrantiesRule(companyId: string): Promise<void> {
  const db = getAdminFirestore();
  const normalized = normalizeCompanyId(companyId);
  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  const end = tomorrow.toISOString();

  const snap = await db
    .collection("companies")
    .doc(normalized)
    .collection("workOrders")
    .where("warrantyExpiresAt", "<=", end)
    .limit(20)
    .get();

  if (snap.empty) return;

  const orders = snap.docs
    .map((doc) => mapAdminWorkOrder(doc.id, doc.data() as Record<string, unknown>))
    .filter(Boolean);

  if (orders.length === 0) return;

  await emitNotificationEvent({
    companyId: normalized,
    eventType: "warranty.expiring",
    payload: {
      summary: `Истекает гарантия у ${orders.length} нарядов`,
      count: orders.length,
    },
  });
}

/** Detect inventory below threshold. */
export async function evaluateLowInventoryRule(companyId: string): Promise<void> {
  const db = getAdminFirestore();
  const normalized = normalizeCompanyId(companyId);
  const snap = await db
    .collection("companies")
    .doc(normalized)
    .collection("inventoryItems")
    .where("status", "==", "active")
    .limit(200)
    .get();

  const lowStock = snap.docs.filter((doc) => {
    const data = doc.data();
    const available = Number(data.totalAvailable ?? 0);
    const threshold = Number(data.lowStockThreshold ?? 1);
    return available <= threshold;
  });

  if (lowStock.length === 0) return;

  await emitNotificationEvent({
    companyId: normalized,
    eventType: "inventory.low_stock",
    payload: {
      summary: `${lowStock.length} позиций ниже минимума`,
      count: lowStock.length,
    },
  });
}

export async function runCompanyNotificationRules(companyId: string): Promise<void> {
  await Promise.all([
    evaluateLowInventoryRule(companyId),
    evaluateOverdueInvoicesRule(companyId),
  ]);
}

export async function runEveningNotificationRules(companyId: string): Promise<void> {
  await evaluateOpenWorkOrdersRule(companyId);
}

export async function runMorningNotificationRules(companyId: string): Promise<void> {
  await evaluateExpiringWarrantiesRule(companyId);
  await runMorningCoreBriefing(companyId);
}

function briefingSummary(companyName: string, attention: { id: string; count?: number }[]): string {
  if (attention.length === 0) return `${companyName}: quiet morning.`;
  return attention
    .map((item) => {
      if (item.id === "lowStock") return `${item.count ?? 0} parts below reorder`;
      if (item.id === "openWorkOrders") return `${item.count ?? 0} open work orders`;
      if (item.id === "negativeNet") return "7-day net is negative";
      if (item.id === "noEngines") return "no engines available";
      return item.id;
    })
    .join("; ");
}

export async function runMorningCoreBriefing(companyId: string): Promise<void> {
  const { briefing } = await compileCompanyBrain(companyId);
  const dayKey = new Date().toISOString().slice(0, 10);
  await emitNotificationEvent({
    companyId,
    eventType: "core.shift_briefing",
    payload: {
      summary: briefingSummary(briefing.companyName, briefing.attention),
      companyName: briefing.companyName,
      dayKey,
    },
    deepLink: "/",
  });
}
