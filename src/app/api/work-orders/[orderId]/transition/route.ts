import { NextRequest, NextResponse } from "next/server";

import { WorkOrderStatus, WORK_ORDER_STATUSES } from "@/domain/work-order";
import { MobileAccessError, verifyMobileAccess } from "@/lib/auth/verify-mobile-access.server";
import { kickDocumentQueueWorker } from "@/lib/documents/engine/kick-document-queue";
import { transitionMobileWorkOrder } from "@/lib/mobile/work-orders.server";

export const runtime = "nodejs";
export const maxDuration = 60;

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

    const { order, documentJobId } = await transitionMobileWorkOrder({
      companyId: access.companyId,
      workOrderId: trimmed,
      nextStatus,
      actorUserId: access.uid,
    });

    if (documentJobId) {
      await kickDocumentQueueWorker({
        origin: request.nextUrl.origin,
        companyId: access.companyId,
        jobId: documentJobId,
        authorization: request.headers.get("authorization"),
      });
    }

    return NextResponse.json({ order });
  } catch (error) {
    if (error instanceof MobileAccessError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    console.error("[work-orders/transition]", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Не удалось изменить статус" },
      { status: 500 },
    );
  }
}
