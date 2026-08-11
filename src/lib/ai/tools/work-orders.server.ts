import "server-only";

import { hasPermission, isAssignedToWorkOrder } from "@autocore/rbac";

import { STATUS_LABELS } from "@/components/work-orders/work-order-copy";
import type { WorkOrder, WorkOrderStatus } from "@/domain/work-order";
import {
  adminCreateClient,
  adminCreateVehicle,
  adminCreateWorkOrder,
} from "@/infrastructure/firestore/admin/core-ops-admin";
import { toolFailure, type CoreToolContext } from "@/lib/ai/tools/context";
import {
  WorkOrderAccessError,
  getMobileWorkOrderDetail,
  listMobileWorkOrders,
  transitionMobileWorkOrder,
  type MobileWorkOrderSummary,
} from "@/lib/mobile/work-orders.server";

function workOrderHref(id: string): string {
  return `/work-orders?order=${encodeURIComponent(id)}`;
}

function toSummaryPart(order: MobileWorkOrderSummary) {
  return {
    id: order.id,
    number: order.number,
    status: order.status,
    statusLabel: order.statusLabel,
    clientName: order.clientName,
    vehicleLabel: order.vehicleLabel,
    licensePlate: order.licensePlate,
    partLineCount: order.partLineCount,
    laborLineCount: order.laborLineCount,
    grandTotal: order.grandTotal,
    updatedAt: order.updatedAt,
    assignedToMe: order.assignedToMe,
    href: workOrderHref(order.id),
  };
}

function toSummaryFromWorkOrder(order: WorkOrder, uid: string) {
  return {
    id: order.id,
    number: order.number,
    status: order.status,
    statusLabel: STATUS_LABELS[order.status] ?? order.status,
    clientName: order.clientName,
    vehicleLabel: order.vehicleLabel,
    licensePlate: order.licensePlate,
    partLineCount: order.partLines.length,
    laborLineCount: order.laborLines.length,
    grandTotal: order.pricing.grandTotal,
    updatedAt: (order.updatedAt ?? order.createdAt ?? new Date()).toISOString(),
    assignedToMe: isAssignedToWorkOrder(order, uid),
    href: workOrderHref(order.id),
  };
}

export async function listWorkOrders(
  ctx: CoreToolContext,
  input: { status?: string; mineOnly?: boolean; limit: number },
) {
  const scope = ctx.scopes.workOrders;
  if (scope === "none") {
    return toolFailure("You do not have access to work orders in this company.");
  }

  // Row-level RBAC, not just the permission bit: mechanics and diagnosticians
  // hold `work_orders_view` but may only see orders assigned to them, so the
  // narrow query is forced regardless of what the model asked for.
  const scopeLimited = scope === "assigned_work_orders";
  const mineOnly = scopeLimited || input.mineOnly === true;

  const orders = await listMobileWorkOrders({
    companyId: ctx.companyId,
    uid: ctx.uid,
    mineOnly,
  });

  const wanted = input.status?.trim().toLowerCase();
  const matched = wanted ? orders.filter((order) => order.status.toLowerCase() === wanted) : orders;

  return {
    ok: true as const,
    orders: matched.slice(0, input.limit).map(toSummaryPart),
    totalMatched: matched.length,
    scopeLimited,
    href: "/work-orders",
  };
}

export async function getWorkOrder(ctx: CoreToolContext, input: { workOrderId: string }) {
  const scope = ctx.scopes.workOrders;
  if (scope === "none") {
    return toolFailure("You do not have access to work orders in this company.");
  }

  try {
    // Passing `scope` makes the helper run `assertWorkOrderAccess`, which
    // rejects unassigned orders for mechanics.
    const detail = await getMobileWorkOrderDetail({
      companyId: ctx.companyId,
      workOrderId: input.workOrderId,
      uid: ctx.uid,
      scope,
    });

    if (!detail) {
      return toolFailure(`Work order "${input.workOrderId}" was not found.`);
    }

    return {
      ok: true as const,
      order: {
        ...toSummaryPart(detail),
        clientPhone: detail.clientPhone,
        vin: detail.vin,
        mileage: detail.mileage,
        comment: detail.comment,
        partLines: detail.partLines.map((line) => ({
          id: line.id,
          name: line.name,
          sku: line.sku,
          quantity: line.quantity,
          unitPrice: line.unitPrice,
        })),
        laborTitles: detail.laborTitles,
        nextStatuses: detail.nextStatuses.map((next) => ({
          status: next.status,
          label: next.label,
        })),
      },
    };
  } catch (error) {
    if (error instanceof WorkOrderAccessError) {
      return toolFailure("That work order is not assigned to you.");
    }
    throw error;
  }
}

export async function transitionWorkOrderStatus(
  ctx: CoreToolContext,
  input: { workOrderId: string; status: WorkOrderStatus },
) {
  if (!hasPermission(ctx.profile, "work_orders_edit")) {
    return toolFailure("Your role cannot change work-order status.");
  }
  if (ctx.scopes.workOrders === "none") {
    return toolFailure("You do not have access to work orders in this company.");
  }

  try {
    const { order, documentJobId } = await transitionMobileWorkOrder({
      companyId: ctx.companyId,
      workOrderId: input.workOrderId.trim(),
      nextStatus: input.status,
      actorUserId: ctx.uid,
      scope: ctx.scopes.workOrders,
    });
    return {
      ok: true as const,
      order: toSummaryPart(order),
      documentJobId,
    };
  } catch (error) {
    if (error instanceof WorkOrderAccessError) {
      return toolFailure("That work order is not assigned to you.");
    }
    throw error;
  }
}

export async function createWorkOrder(
  ctx: CoreToolContext,
  input: {
    clientName: string;
    clientPhone: string;
    licensePlate?: string;
    vin?: string;
    vehicleMake?: string;
    vehicleModel?: string;
    mileage?: number;
    comment?: string;
    laborTitle?: string;
  },
) {
  if (!hasPermission(ctx.profile, "work_orders_edit")) {
    return toolFailure("Your role cannot create work orders.");
  }

  const client = await adminCreateClient({
    companyId: ctx.companyId,
    fullName: input.clientName.trim(),
    phone: input.clientPhone.trim(),
    createdByUserId: ctx.uid,
  });

  const make = input.vehicleMake?.trim() || "";
  const model = input.vehicleModel?.trim() || "";
  const licensePlate = input.licensePlate?.trim() || "";
  const vin = input.vin?.trim() || "";
  const mileage = input.mileage ?? 0;

  const vehicle = await adminCreateVehicle({
    companyId: ctx.companyId,
    clientId: client.id,
    make,
    model,
    vin,
    licensePlate,
    currentMileage: mileage,
    createdByUserId: ctx.uid,
  });

  const laborLines = input.laborTitle?.trim()
    ? [
        {
          id: `labor-${Date.now()}`,
          title: input.laborTitle.trim(),
          hours: 0,
          unitPrice: 0,
          assigneeIds: [] as string[],
          assigneeRole: "mechanic" as const,
        },
      ]
    : [];

  const order = await adminCreateWorkOrder({
    companyId: ctx.companyId,
    clientId: client.id,
    clientName: client.fullName,
    clientPhone: client.phone,
    vehicleId: vehicle.id,
    vehicleLabel: [make, model, licensePlate].filter(Boolean).join(" "),
    vin,
    licensePlate,
    mileage,
    comment: input.comment?.trim(),
    laborLines,
    partLines: [],
    motorLines: [],
    pricing: {
      laborTotal: 0,
      partsTotal: 0,
      motorsTotal: 0,
      discount: 0,
      grandTotal: 0,
    },
    paymentAccount: "cashbox",
    paymentMethod: "cash",
    createdByUserId: ctx.uid,
  });

  return {
    ok: true as const,
    order: toSummaryFromWorkOrder(order, ctx.uid),
    clientId: client.id,
    vehicleId: vehicle.id,
  };
}
