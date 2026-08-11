import "server-only";

import { hasPermission } from "@autocore/rbac";

import { adminCreateFinancialOperation } from "@/infrastructure/firestore/admin/core-ops-admin";
import { getAdminFirestore } from "@/infrastructure/firebase/admin";
import { TOP_LEVEL_COLLECTIONS } from "@/infrastructure/firestore/collections";
import { toolFailure, type CoreToolContext } from "@/lib/ai/tools/context";
import { normalizeCompanyId } from "@/lib/company-id";

/** Read cap for one finance window — matches the dashboard overview budget. */
const FINANCE_READ_CAP = 500;

const INCOME_TYPES = new Set(["income", "sale"]);
const EXPENSE_TYPES = new Set(["expense", "refund"]);

function toDate(value: unknown): Date | null {
  if (value && typeof value === "object" && "toDate" in value && typeof value.toDate === "function") {
    return (value as { toDate: () => Date }).toDate();
  }
  if (value instanceof Date) return value;
  return null;
}

function dayKey(date: Date): string {
  return date.toISOString().slice(0, 10);
}

export async function getFinanceSummary(ctx: CoreToolContext, input: { periodDays: number }) {
  // `own_payroll` is a *different dataset*, not a lesser one — a mechanic who
  // can see their own payroll must never receive company-wide totals.
  if (ctx.scopes.accounting !== "company") {
    return toolFailure("You do not have access to company accounting.");
  }

  const since = new Date();
  since.setDate(since.getDate() - input.periodDays);
  since.setHours(0, 0, 0, 0);

  const db = getAdminFirestore();
  // Uses the `financialOperations: companyId ASC, createdAt DESC` composite
  // index added alongside this tool.
  const snapshot = await db
    .collection(TOP_LEVEL_COLLECTIONS.financialOperations)
    .where("companyId", "==", normalizeCompanyId(ctx.companyId))
    .where("createdAt", ">=", since)
    .orderBy("createdAt", "desc")
    .limit(FINANCE_READ_CAP)
    .get();

  let income = 0;
  let expense = 0;
  let currency = "USD";
  const byDay = new Map<string, number>();

  for (const doc of snapshot.docs) {
    const data = doc.data() as Record<string, unknown>;
    const amount = Number(data.amount);
    const createdAt = toDate(data.createdAt);
    const type = String(data.type ?? "");
    if (!createdAt || !Number.isFinite(amount)) continue;

    if (typeof data.currency === "string" && data.currency.trim()) {
      currency = data.currency.trim();
    }

    const signed = INCOME_TYPES.has(type) ? amount : EXPENSE_TYPES.has(type) ? -amount : 0;
    if (signed === 0 && !INCOME_TYPES.has(type) && !EXPENSE_TYPES.has(type)) continue;

    if (signed > 0) income += amount;
    else expense += amount;

    byDay.set(dayKey(createdAt), (byDay.get(dayKey(createdAt)) ?? 0) + signed);
  }

  // Dense series, oldest first — a sparkline needs every day, including zeros.
  const series: Array<{ date: string; value: number }> = [];
  for (let offset = input.periodDays - 1; offset >= 0; offset -= 1) {
    const day = new Date();
    day.setDate(day.getDate() - offset);
    const key = dayKey(day);
    series.push({ date: key, value: Math.round((byDay.get(key) ?? 0) * 100) / 100 });
  }

  return {
    ok: true as const,
    periodDays: input.periodDays,
    currency,
    income: Math.round(income * 100) / 100,
    expense: Math.round(expense * 100) / 100,
    net: Math.round((income - expense) * 100) / 100,
    operationCount: snapshot.size,
    series,
    truncated: snapshot.size >= FINANCE_READ_CAP,
    href: "/accounting",
  };
}

export async function createAccountingOperation(
  ctx: CoreToolContext,
  input: {
    type: "income" | "expense";
    amount: number;
    account: "cashbox" | "kaspi";
    paymentMethod: "cash" | "transfer" | "mixed";
    category?: string;
    comment?: string;
  },
) {
  if (ctx.scopes.accounting !== "company" || !hasPermission(ctx.profile, "accounting_edit")) {
    return toolFailure("Your role cannot post company accounting operations.");
  }

  const operationId = await adminCreateFinancialOperation({
    companyId: ctx.companyId,
    type: input.type,
    amount: input.amount,
    account: input.account,
    paymentMethod: input.paymentMethod,
    category: input.category?.trim() || null,
    comment: input.comment?.trim() || null,
    createdByUserId: ctx.uid,
  });

  return {
    ok: true as const,
    operationId,
    type: input.type,
    amount: input.amount,
    href: "/accounting",
  };
}
