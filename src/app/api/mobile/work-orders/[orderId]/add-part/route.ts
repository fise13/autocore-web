import { NextRequest, NextResponse } from "next/server";

import { MobileAccessError, verifyMobileAccess } from "@/lib/auth/verify-mobile-access.server";
import {
  addPartByBarcodeToMobileWorkOrder,
  addPartToMobileWorkOrder,
  WorkOrderAccessError,
} from "@/lib/mobile/work-orders.server";

export const runtime = "nodejs";

type RouteContext = {
  params: Promise<{ orderId: string }>;
};

type AddPartPayload = {
  itemId?: unknown;
  barcode?: unknown;
  quantity?: unknown;
};

export async function POST(request: NextRequest, context: RouteContext) {
  try {
    const access = await verifyMobileAccess(request, "work_orders_edit");
    const { orderId } = await context.params;
    const trimmed = orderId?.trim();
    if (!trimmed) {
      return NextResponse.json({ error: "orderId is required" }, { status: 400 });
    }

    const body = (await request.json()) as AddPartPayload;
    const quantity = body.quantity == null ? 1 : Number(body.quantity);
    const itemId = typeof body.itemId === "string" ? body.itemId.trim() : "";
    const barcode = typeof body.barcode === "string" ? body.barcode.trim() : "";
    const scope = access.scopes.workOrders;

    const order =
      itemId
        ? await addPartToMobileWorkOrder({
            companyId: access.companyId,
            workOrderId: trimmed,
            actorUserId: access.uid,
            itemId,
            quantity,
            scope,
          })
        : barcode
          ? await addPartByBarcodeToMobileWorkOrder({
              companyId: access.companyId,
              workOrderId: trimmed,
              actorUserId: access.uid,
              barcode,
              quantity,
              scope,
            })
          : null;

    if (!order) {
      return NextResponse.json({ error: "Provide an itemId or a barcode" }, { status: 400 });
    }

    return NextResponse.json({ order });
  } catch (error) {
    if (error instanceof MobileAccessError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    if (error instanceof WorkOrderAccessError) {
      return NextResponse.json({ error: error.message }, { status: 403 });
    }
    console.error("[mobile/work-orders/add-part]", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Could not add the part" },
      { status: 500 },
    );
  }
}
