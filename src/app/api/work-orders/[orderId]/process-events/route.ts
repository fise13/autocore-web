import { NextRequest, NextResponse } from "next/server";

import { processWorkOrderEventsUseCase } from "@/application/use-cases/process-work-order-events.server";
import { kickDocumentQueueWorker } from "@/lib/documents/engine/kick-document-queue";
import {
  assertOrderCompanyAccess,
  DocumentAccessError,
  verifyDocumentAccess,
} from "@/lib/documents/verify-document-access";
import { fetchWorkOrder } from "@/infrastructure/firestore/admin/work-order-effects-admin";

export const runtime = "nodejs";
export const maxDuration = 60;

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

    const result = await processWorkOrderEventsUseCase({
      companyId: access.companyId,
      workOrderId: trimmedOrderId,
      actorUserId: access.uid,
    });

    if (result.jobId) {
      await kickDocumentQueueWorker({
        origin: request.nextUrl.origin,
        companyId: access.companyId,
        jobId: result.jobId,
        authorization: request.headers.get("authorization"),
      });
    }

    return NextResponse.json(result);
  } catch (error) {
    if (error instanceof DocumentAccessError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    console.error("[work-orders/process-events]", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to process events" },
      { status: 500 },
    );
  }
}
