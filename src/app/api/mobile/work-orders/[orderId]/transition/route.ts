import { NextRequest, NextResponse } from "next/server";

import { WorkOrderStatus, WORK_ORDER_STATUSES } from "@/domain/work-order";
import { MobileAccessError, verifyMobileAccess } from "@/lib/auth/verify-mobile-access.server";
import { transitionMobileWorkOrder } from "@/lib/mobile/work-orders.server";

export const runtime = "nodejs";

type RouteContext = {
  params: Promise<{ orderId: string }>;
};

type TransitionPayload = {
  status?: unknown;
};

export async function POST(request: NextRequest, context: RouteContext) {
  try {
    const access = await verifyMobileAccess(request, "work_orders_edit");
    const { orderId } = await context.params;
    const trimmed = orderId?.trim();
    if (!trimmed) {
      return NextResponse.json({ error: "orderId is required" }, { status: 400 });
    }

    const body = (await request.json()) as TransitionPayload;
    const nextStatus = String(body.status ?? "") as WorkOrderStatus;
    if (!WORK_ORDER_STATUSES.includes(nextStatus)) {
      return NextResponse.json({ error: "Некорректный статус" }, { status: 400 });
    }

    const order = await transitionMobileWorkOrder({
      companyId: access.companyId,
      workOrderId: trimmed,
      nextStatus,
      actorUserId: access.uid,
    });

    return NextResponse.json({ order });
  } catch (error) {
    if (error instanceof MobileAccessError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    console.error("[mobile/work-orders/transition]", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Не удалось изменить статус" },
      { status: 500 },
    );
  }
}
