import "server-only";

import { hasPermission, isAssignedToWorkOrder } from "@autocore/rbac";

import { STATUS_LABELS } from "@/components/work-orders/work-order-copy";
import {
  calculateWorkOrderPricing,
  type WorkOrder,
  type WorkOrderLaborLine,
  type WorkOrderPartLine,
  type WorkOrderStatus,
} from "@/domain/work-order";
import {
  adminCreateClient,
  adminCreateVehicle,
  adminCreateWorkOrder,
} from "@/infrastructure/firestore/admin/core-ops-admin";
import { fetchWorkOrder } from "@/infrastructure/firestore/admin/work-order-effects-admin";
import { toolFailure, type CoreToolContext } from "@/lib/ai/tools/context";
import {
  WorkOrderAccessError,
  assertWorkOrderAccess,
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
    clientId: order.clientId,
    clientName: order.clientName,
    clientPhone: order.clientPhone,
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
    clientId: order.clientId,
    clientName: order.clientName,
    clientPhone: order.clientPhone,
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
  input: { status?: string; mineOnly?: boolean; includeClosed?: boolean; limit: number },
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
  const wanted = input.status?.trim().toLowerCase();

  const orders = await listMobileWorkOrders({
    companyId: ctx.companyId,
    uid: ctx.uid,
    mineOnly,
    includeClosed: input.includeClosed === true || Boolean(wanted),
  });

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
    clientName?: string;
    clientPhone?: string;
    sourceWorkOrderId?: string;
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

  const sourceId = input.sourceWorkOrderId?.trim();
  let source: WorkOrder | null = null;
  if (sourceId) {
    source = await fetchWorkOrder(ctx.companyId, sourceId);
    if (!source) {
      return toolFailure(`Work order "${sourceId}" was not found.`);
    }
    try {
      assertWorkOrderAccess(source, ctx.uid, ctx.scopes.workOrders);
    } catch (error) {
      if (error instanceof WorkOrderAccessError) {
        return toolFailure("That work order is not assigned to you.");
      }
      throw error;
    }
  }

  const clientName = (input.clientName?.trim() || source?.clientName || "").trim();
  const clientPhone = (input.clientPhone?.trim() || source?.clientPhone || "").trim();
  if (!source && (clientName.length < 2 || clientPhone.length < 3)) {
    return toolFailure("Provide a client name and phone, or sourceWorkOrderId from the last job.");
  }

  let clientId = source?.clientId ?? "";
  let resolvedName = clientName || source?.clientName || "Client";
  let resolvedPhone = clientPhone || source?.clientPhone || "n/a";

  if (!clientId) {
    const client = await adminCreateClient({
      companyId: ctx.companyId,
      fullName: resolvedName,
      phone: resolvedPhone === "n/a" ? "n/a" : resolvedPhone,
      createdByUserId: ctx.uid,
    });
    clientId = client.id;
    resolvedName = client.fullName;
    resolvedPhone = client.phone;
  }

  const make = input.vehicleMake?.trim() || "";
  const model = input.vehicleModel?.trim() || "";
  const licensePlate = input.licensePlate?.trim() || source?.licensePlate || "";
  const vin = input.vin?.trim() || source?.vin || "";
  const mileage = input.mileage ?? source?.mileage ?? 0;
  let vehicleId = source?.vehicleId ?? "";
  let vehicleLabel =
    source?.vehicleLabel || [make, model, licensePlate].filter(Boolean).join(" ");

  if (!vehicleId) {
    const vehicle = await adminCreateVehicle({
      companyId: ctx.companyId,
      clientId,
      make,
      model,
      vin,
      licensePlate,
      currentMileage: mileage,
      createdByUserId: ctx.uid,
    });
    vehicleId = vehicle.id;
    vehicleLabel = [make, model, licensePlate].filter(Boolean).join(" ");
  }

  const laborLines: WorkOrderLaborLine[] = source
    ? source.laborLines
        .filter((line) => line.title.trim())
        .map((line) => ({
          ...line,
          id: `labor-${crypto.randomUUID()}`,
          assigneeIds: [],
        }))
    : input.laborTitle?.trim()
      ? [
          {
            id: `labor-${crypto.randomUUID()}`,
            title: input.laborTitle.trim(),
            hours: 0,
            unitPrice: 0,
            assigneeIds: [] as string[],
            assigneeRole: "mechanic" as const,
          },
        ]
      : [];

  const partLines: WorkOrderPartLine[] = source
    ? source.partLines
        .filter((line) => line.name.trim() && line.quantity > 0)
        .map((line) => ({
          id: `part-${crypto.randomUUID()}`,
          source: "adhoc" as const,
          sku: line.sku,
          name: line.name,
          quantity: line.quantity,
          unitPrice: line.unitPrice,
          unitCost: line.unitCost,
          specificCategoryId: line.specificCategoryId,
          specificCategoryName: line.specificCategoryName,
          warrantyTemplateId: line.warrantyTemplateId,
        }))
    : [];

  const pricing = calculateWorkOrderPricing(laborLines, partLines, []);

  const order = await adminCreateWorkOrder({
    companyId: ctx.companyId,
    clientId,
    clientName: resolvedName,
    clientPhone: resolvedPhone,
    vehicleId,
    vehicleLabel,
    vin,
    licensePlate,
    mileage,
    comment:
      input.comment?.trim() ||
      (source ? `Copied from work order #${source.number}` : undefined),
    laborLines,
    partLines,
    motorLines: [],
    pricing: {
      ...pricing,
      motorsTotal: 0,
      grandTotal: Math.max(0, pricing.laborTotal + pricing.partsTotal - pricing.discount),
    },
    paymentAccount: "cashbox",
    paymentMethod: "cash",
    createdByUserId: ctx.uid,
  });

  return {
    ok: true as const,
    order: toSummaryFromWorkOrder(order, ctx.uid),
    clientId,
    vehicleId,
  };
}
