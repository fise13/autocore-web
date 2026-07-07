import { NextRequest, NextResponse } from "next/server";

import { MobileAccessError, verifyMobileAccess } from "@/lib/auth/verify-mobile-access.server";
import {
  claimMobileWorkOrder,
  WorkOrderAccessError,
  WorkOrderClaimError,
} from "@/lib/mobile/work-orders.server";

export const runtime = "nodejs";

type RouteContext = {
  params: Promise<{ orderId: string }>;
};

type ClaimPayload = {
  laborLineId?: unknown;
};

export async function POST(request: NextRequest, context: RouteContext) {
  try {
    const access = await verifyMobileAccess(request, "work_orders_view");
    const { orderId } = await context.params;
    const trimmed = orderId?.trim();
    if (!trimmed) {
      return NextResponse.json({ error: "orderId is required" }, { status: 400 });
    }

    const body = (await request.json().catch(() => ({}))) as ClaimPayload;
    const laborLineId =
      typeof body.laborLineId === "string" && body.laborLineId.trim()
        ? body.laborLineId.trim()
        : undefined;

    const order = await claimMobileWorkOrder({
      companyId: access.companyId,
      workOrderId: trimmed,
      actorUserId: access.uid,
      actorName: access.profile.displayName ?? undefined,
      laborLineId,
      scope: access.scopes.workOrders,
    });

    return NextResponse.json({ order });
  } catch (error) {
    if (error instanceof MobileAccessError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    if (error instanceof WorkOrderAccessError) {
      return NextResponse.json({ error: error.message }, { status: 403 });
    }
    if (error instanceof WorkOrderClaimError) {
      return NextResponse.json({ error: error.message }, { status: 409 });
    }
    console.error("[mobile/work-orders/claim]", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Не удалось взять наряд в работу" },
      { status: 500 },
    );
  }
}
