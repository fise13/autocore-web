import { NextRequest, NextResponse } from "next/server";

import { fetchWorkOrder } from "@/infrastructure/firestore/admin/work-order-effects-admin";
import {
  assertOrderCompanyAccess,
  DocumentAccessError,
  verifyDocumentAccess,
} from "@/lib/documents/verify-document-access";
import { maybeEmitWorkOrderAvailableNotification } from "@/lib/notifications/emit-work-order-available.server";

export const runtime = "nodejs";

type RouteContext = {
  params: Promise<{ orderId: string }>;
};

export async function POST(request: NextRequest, context: RouteContext) {
  try {
    const access = await verifyDocumentAccess(request);
    const { orderId } = await context.params;
    const trimmedOrderId = orderId?.trim();
    if (!trimmedOrderId) {
      return NextResponse.json({ error: "orderId is required" }, { status: 400 });
    }

    const order = await fetchWorkOrder(access.companyId, trimmedOrderId);
    if (!order) {
      return NextResponse.json({ error: "Work order not found" }, { status: 404 });
    }
    await assertOrderCompanyAccess(access.companyId, order.companyId);

    await maybeEmitWorkOrderAvailableNotification({
      companyId: access.companyId,
      order,
      actorUserId: access.uid,
    });

    return NextResponse.json({ ok: true });
  } catch (error) {
    if (error instanceof DocumentAccessError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    console.error("[work-orders/notify-available]", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to notify work order availability" },
      { status: 500 },
    );
  }
}
