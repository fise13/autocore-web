import "server-only";

import { FinancialOperation } from "@/domain/financial-operation";
import { InventoryItem } from "@/domain/inventory";
import { MotorEntity } from "@/domain/motor";
import { WorkOrder } from "@/domain/work-order";
import { UserEntity } from "@/domain/user";
import { getAdminFirestore } from "@/infrastructure/firebase/admin";
import { mapAdminUser, mapAdminWorkOrder } from "@/infrastructure/firestore/admin-mappers";
import { canAccessMotorsArea, isNavAllowed } from "@/lib/auth/app-access";
import { can, canViewEmployees } from "@/lib/auth/permissions";
import { normalizeCompanyId } from "@/lib/company-id";
import {
  buildDailyRevenueSeries,
  buildDashboardStats,
  buildIncomeExpenseSeries,
  buildWorkOrdersDailySeries,
  type DashboardStat,
} from "@/lib/mission-control/compute-dashboard-charts";
import { computeOverviewMetrics } from "@/lib/mission-control/compute-overview-metrics";
import { listMotorDocuments } from "@/lib/desktop/fetch-motor.server";

function toDate(value: unknown): Date | null {
  if (value && typeof value === "object" && "toDate" in value && typeof value.toDate === "function") {
    return value.toDate() as Date;
  }
  if (value instanceof Date) return value;
  return null;
}

function mapOperation(id: string, data: Record<string, unknown>): FinancialOperation | null {
  const typeRaw = String(data.type ?? "");
  const amount = Number(data.amount);
  const createdAt = toDate(data.createdAt);
  if (!createdAt || !Number.isFinite(amount)) return null;
  if (!["expense", "income", "sale", "refund"].includes(typeRaw)) return null;

  return {
    id,
    companyId: String(data.companyId ?? ""),
    type: typeRaw as FinancialOperation["type"],
    amount,
    paymentMethod: (String(data.paymentMethod ?? "cash") as FinancialOperation["paymentMethod"]) || "cash",
    account: (String(data.account ?? "cashbox") as FinancialOperation["account"]) || "cashbox",
    createdAt,
    createdByUserId: String(data.createdByUserId ?? ""),
    description: typeof data.description === "string" ? data.description : undefined,
    category: typeof data.category === "string" ? data.category : undefined,
    relatedMotorId: typeof data.motorId === "string" ? data.motorId : undefined,
    relatedWorkOrderId: typeof data.workOrderId === "string" ? data.workOrderId : undefined,
  };
}

function mapInventoryItem(id: string, data: Record<string, unknown>): InventoryItem {
  const totalOnHand = Number(data.totalOnHand ?? data.quantity ?? 0);
  return {
    id,
    companyId: String(data.companyId ?? ""),
    type: "generic",
    sku: String(data.sku ?? id),
    name: String(data.name ?? ""),
    barcodes: [],
    unit: String(data.unit ?? "шт"),
    currency: String(data.currency ?? "KZT"),
    brandName: typeof data.brandName === "string" ? data.brandName : String(data.brand ?? ""),
    status: (String(data.status ?? "active") as InventoryItem["status"]) || "active",
    totalOnHand,
    totalAvailable: Number(data.totalAvailable ?? totalOnHand),
    averageCost: Number(data.averageCost ?? data.purchasePrice ?? 0),
    stockValue: Number(data.stockValue ?? 0),
    lowStockThreshold: Number(data.lowStockThreshold ?? 1),
    inventoryGroup: "consumables",
    createdAt: toDate(data.createdAt) ?? new Date(),
    updatedAt: toDate(data.updatedAt) ?? new Date(),
  };
}

export type DesktopOverviewPayload = {
  stats: DashboardStat[];
  revenueSeries: ReturnType<typeof buildDailyRevenueSeries>;
  incomeExpenseSeries: ReturnType<typeof buildIncomeExpenseSeries>;
  workOrdersSeries: ReturnType<typeof buildWorkOrdersDailySeries>;
  warehouseHealth: {
    motorAvailable: number;
    motorLowStock: number;
    segments: { key: "motors" | "warehouse" | "deficits"; label: string; share: number }[];
    deficitShare: number;
  };
  permissions: {
    canAccounting: boolean;
    canMotors: boolean;
    canWarehouse: boolean;
    canWorkOrders: boolean;
  };
};

function formatMoneyKzt(value: number): string {
  return `${value.toLocaleString("ru-RU")} ₸`;
}

export async function buildDesktopOverview(
  companyId: string,
  user: UserEntity,
  isPro = true,
): Promise<DesktopOverviewPayload> {
  const normalizedCompanyId = normalizeCompanyId(companyId);
  const db = getAdminFirestore();

  const canAccounting = can(user, "accounting_view");
  const canMotors = canAccessMotorsArea(user);
  const canWarehouse = isNavAllowed(user, "warehouse");
  const canWorkOrders = can(user, "work_orders_view");
  const canEmployees = isPro && canViewEmployees(user);

  const motors: MotorEntity[] = canMotors
    ? (await listMotorDocuments(normalizedCompanyId)).map((doc) => doc.motor)
    : [];

  const [operationsSnap, inventorySnap, workOrdersSnap] = await Promise.all([
    canAccounting
      ? db.collection("financialOperations").where("companyId", "==", normalizedCompanyId).limit(500).get()
      : Promise.resolve(null),
    canWarehouse
      ? db.collection("inventoryItems").where("companyId", "==", normalizedCompanyId).limit(500).get()
      : Promise.resolve(null),
    canWorkOrders
      ? db.collection("companies").doc(normalizedCompanyId).collection("workOrders").limit(200).get()
      : Promise.resolve(null),
  ]);

  const operations =
    operationsSnap?.docs
      .map((doc) => mapOperation(doc.id, doc.data() as Record<string, unknown>))
      .filter((item): item is FinancialOperation => item != null)
      .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime()) ?? [];

  const warehouseItems =
    inventorySnap?.docs.map((doc) => mapInventoryItem(doc.id, doc.data() as Record<string, unknown>)) ?? [];

  const workOrders =
    workOrdersSnap?.docs
      .map((doc) => mapAdminWorkOrder(doc.id, doc.data() as Record<string, unknown>))
      .filter((item): item is WorkOrder => item != null) ?? [];

  const metrics = computeOverviewMetrics({
    operations,
    motors,
    warehouseItems,
    employees: [],
    activityLogs: [],
  });

  const stats = buildDashboardStats({
    metrics,
    operations,
    permissions: { canAccounting, canMotors, canWarehouse, canEmployees },
    formatMoney: formatMoneyKzt,
  });

  const activeWarehouse = warehouseItems.filter((item) => item.status === "active");
  const warehouseLow = activeWarehouse.filter(
    (item) => item.totalAvailable <= (item.lowStockThreshold ?? 1),
  ).length;
  const warehouseHealthy = Math.max(0, activeWarehouse.length - warehouseLow);
  const motorsHealthy = Math.max(0, metrics.activeInventoryCount - metrics.lowStockCount);
  const deficits = metrics.lowStockCount + warehouseLow;

  const rawSegments: { key: "motors" | "warehouse" | "deficits"; label: string; share: number }[] = [];
  if (canMotors && motorsHealthy > 0) {
    rawSegments.push({ key: "motors", label: "Моторы", share: motorsHealthy });
  }
  if (canWarehouse && warehouseHealthy > 0) {
    rawSegments.push({ key: "warehouse", label: "Склад", share: warehouseHealthy });
  }
  if (deficits > 0) {
    rawSegments.push({ key: "deficits", label: "Дефициты", share: deficits });
  }

  const total = rawSegments.reduce((sum, item) => sum + item.share, 0) || 1;
  const segments =
    rawSegments.length > 0
      ? rawSegments.map((item) => ({
          ...item,
          share: Math.round((item.share / total) * 100),
        }))
      : [{ key: "motors" as const, label: "Моторы", share: 100 }];

  const deficitShare = segments.find((item) => item.key === "deficits")?.share ?? 0;

  return {
    stats,
    revenueSeries: buildDailyRevenueSeries(operations, 7),
    incomeExpenseSeries: buildIncomeExpenseSeries(operations, 10),
    workOrdersSeries: buildWorkOrdersDailySeries(workOrders, 7),
    warehouseHealth: {
      motorAvailable: metrics.activeInventoryCount,
      motorLowStock: metrics.lowStockCount,
      segments,
      deficitShare,
    },
    permissions: { canAccounting, canMotors, canWarehouse, canWorkOrders },
  };
}

export async function loadDesktopOverviewUser(uid: string): Promise<UserEntity | null> {
  const snapshot = await getAdminFirestore().collection("users").doc(uid).get();
  if (!snapshot.exists) return null;
  return mapAdminUser(snapshot.id, snapshot.data() as Record<string, unknown>);
}
