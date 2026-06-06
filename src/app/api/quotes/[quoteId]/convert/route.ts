import { NextRequest, NextResponse } from "next/server";

import { convertQuoteToWorkOrderUseCase } from "@/application/use-cases/quotes/convert-quote-to-work-order";
import { createDomainEventRepository } from "@/infrastructure/firestore/domain-event-repository";
import { createQuoteRepository } from "@/infrastructure/firestore/quote-repository";
import { createWorkOrderRepository } from "@/infrastructure/firestore/work-order-repository";
import {
  DocumentAccessError,
  verifyDocumentAccess,
} from "@/lib/documents/verify-document-access";

export const runtime = "nodejs";

type RouteContext = {
  params: Promise<{ quoteId: string }>;
};

export async function POST(request: NextRequest, context: RouteContext) {
  try {
    const access = await verifyDocumentAccess(request);
    const { quoteId } = await context.params;

    const workOrderId = await convertQuoteToWorkOrderUseCase(
      createQuoteRepository(),
      createWorkOrderRepository(),
      createDomainEventRepository(),
      {
        companyId: access.companyId,
        quoteId: quoteId.trim(),
        actorUserId: access.uid,
      },
    );

    void fetch(`${request.nextUrl.origin}/api/work-orders/${encodeURIComponent(workOrderId)}/process-events`, {
      method: "POST",
      headers: {
        Authorization: request.headers.get("authorization") ?? "",
        "Content-Type": "application/json",
      },
    }).catch(() => undefined);

    return NextResponse.json({ workOrderId });
  } catch (error) {
    if (error instanceof DocumentAccessError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    console.error("[quotes/convert]", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to convert quote" },
      { status: 500 },
    );
  }
}
