import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { PayrollTransaction } from "@/domain/payroll-transaction";
import { WorkOrder } from "@/domain/work-order";
import {
  buildWeekBarsFromMap,
  computeMyEarningsSummary,
  filterPayrollTransactions,
} from "@/lib/my-earnings/compute-my-earnings";
import { computeEmployeeDashboard } from "@/lib/overview/compute-employee-dashboard";

function payroll(
  overrides: Partial<PayrollTransaction> & Pick<PayrollTransaction, "id" | "amount" | "status">,
): PayrollTransaction {
  return {
    companyId: "c1",
    employeeId: "uid-1",
    workOrderId: "wo-1",
    laborLineId: "line-1",
    role: "mechanic",
    rateType: "fixed",
    rate: 1000,
    createdAt: new Date("2026-07-01T10:00:00"),
    ...overrides,
  };
}

function order(overrides: Partial<WorkOrder> & Pick<WorkOrder, "id" | "status">): WorkOrder {
  return {
    companyId: "c1",
    number: "100",
    clientId: "client",
    vehicleId: "vehicle",
    vin: "",
    licensePlate: "A001AA",
    mileage: 0,
    laborLines: [{ id: "l1", title: "Work", hours: 1, unitPrice: 1000, assigneeIds: ["uid-1"], assigneeRole: "mechanic" }],
    partLines: [],
    motorLines: [],
    pricing: { laborTotal: 1000, partsTotal: 0, motorsTotal: 0, discount: 0, grandTotal: 1000 },
    createdByUserId: "uid-1",
    createdAt: new Date("2026-07-01T08:00:00"),
    updatedAt: new Date("2026-07-01T08:00:00"),
    ...overrides,
  };
}

describe("computeMyEarningsSummary", () => {
  const now = new Date("2026-07-07T12:00:00");

  it("aggregates payroll totals and week bars", () => {
    const summary = computeMyEarningsSummary({
      transactions: [
        payroll({ id: "p1", amount: 5000, status: "paid", paidAt: new Date("2026-07-06T12:00:00") }),
        payroll({ id: "p2", amount: 2000, status: "pending" }),
        payroll({ id: "p3", amount: 500, status: "cancelled" }),
      ],
      workOrders: [
        order({
          id: "wo-1",
          status: "completed",
          completedAt: new Date("2026-07-06T15:00:00"),
        }),
      ],
      uid: "uid-1",
      now,
    });

    assert.equal(summary.paid, 5000);
    assert.equal(summary.pending, 2000);
    assert.equal(summary.cancelled, 500);
    assert.equal(summary.paidOrderCount, 1);
    assert.equal(summary.avgPerOrder, 5000);
    assert.equal(summary.earningsWeekBars.length, 7);
    assert.ok(summary.productivityWeekBars.some((bar) => bar.value === 1));
  });

  it("filters payroll by status and period", () => {
    const rows = [
      payroll({ id: "p1", amount: 100, status: "paid", createdAt: new Date("2026-06-01T10:00:00") }),
      payroll({ id: "p2", amount: 200, status: "pending", createdAt: new Date("2026-07-06T10:00:00") }),
    ];
    const filtered = filterPayrollTransactions(rows, "pending", "7d", now);
    assert.deepEqual(filtered.map((row) => row.id), ["p2"]);
  });
});

describe("computeEmployeeDashboard", () => {
  it("builds attention for waiting parts and claimable orders", () => {
    const snapshot = computeEmployeeDashboard({
      uid: "uid-1",
      canAccessEarnings: true,
      transactions: [payroll({ id: "p1", amount: 1000, status: "pending" })],
      workOrders: [
        order({ id: "wo-1", status: "waiting_parts" }),
        order({
          id: "wo-2",
          status: "confirmed",
          laborLines: [{ id: "l2", title: "Free", hours: 1, unitPrice: 500, assigneeIds: [], assigneeRole: "mechanic" }],
        }),
      ],
    });

    assert.ok(snapshot.attentionItems.some((item) => item.id === "waiting-parts"));
    assert.ok(snapshot.attentionItems.some((item) => item.id === "claimable"));
    assert.equal(snapshot.statTiles.length, 4);
  });
});

describe("buildWeekBarsFromMap", () => {
  it("fills seven day labels", () => {
    const map = new Map<string, number>([[new Date("2026-07-07T12:00:00").toDateString(), 3]]);
    const bars = buildWeekBarsFromMap(map, new Date("2026-07-07T12:00:00"), 7);
    assert.equal(bars.length, 7);
    assert.equal(bars.at(-1)?.value, 3);
  });
});
