import { NextRequest, NextResponse } from "next/server";

import { MobileAccessError, verifyMobileAccess } from "@/lib/auth/verify-mobile-access.server";
import {
  addPartByBarcodeToMobileWorkOrder,
  addPartToMobileWorkOrder,
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

    const order =
      itemId
        ? await addPartToMobileWorkOrder({
            companyId: access.companyId,
            workOrderId: trimmed,
            actorUserId: access.uid,
            itemId,
            quantity,
          })
        : barcode
          ? await addPartByBarcodeToMobileWorkOrder({
              companyId: access.companyId,
              workOrderId: trimmed,
              actorUserId: access.uid,
              barcode,
              quantity,
            })
          : null;

    if (!order) {
      return NextResponse.json({ error: "Укажите itemId или barcode" }, { status: 400 });
    }

    return NextResponse.json({ order });
  } catch (error) {
    if (error instanceof MobileAccessError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    console.error("[mobile/work-orders/add-part]", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Не удалось добавить запчасть" },
      { status: 500 },
    );
  }
}
