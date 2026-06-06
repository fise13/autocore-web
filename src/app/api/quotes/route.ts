import { NextRequest, NextResponse } from "next/server";

import { CreateQuoteInput } from "@/domain/quote";
import { WorkOrderPricing } from "@/domain/work-order";
import { createQuoteUseCase } from "@/application/use-cases/quotes/convert-quote-to-work-order";
import { createDomainEventRepository } from "@/infrastructure/firestore/domain-event-repository";
import { createQuoteRepository } from "@/infrastructure/firestore/quote-repository";
import { enqueueDocumentJob } from "@/infrastructure/firestore/admin/work-order-effects-admin";
import {
  DocumentAccessError,
  verifyDocumentAccess,
} from "@/lib/documents/verify-document-access";

export const runtime = "nodejs";

export async function POST(request: NextRequest) {
  try {
    const access = await verifyDocumentAccess(request);
    const body = (await request.json()) as Record<string, unknown>;

    const quoteRepository = createQuoteRepository();
    const domainEventRepository = createDomainEventRepository();

    const pricing = (
      typeof body.pricing === "object" && body.pricing != null ? body.pricing : {}
    ) as Partial<WorkOrderPricing>;

    const quote = await createQuoteUseCase(quoteRepository, domainEventRepository, {
      companyId: access.companyId,
      clientId: String(body.clientId ?? ""),
      clientName: typeof body.clientName === "string" ? body.clientName : undefined,
      clientPhone: typeof body.clientPhone === "string" ? body.clientPhone : undefined,
      vehicleId: typeof body.vehicleId === "string" ? body.vehicleId : undefined,
      vehicleLabel: typeof body.vehicleLabel === "string" ? body.vehicleLabel : undefined,
      vin: typeof body.vin === "string" ? body.vin : undefined,
      licensePlate: typeof body.licensePlate === "string" ? body.licensePlate : undefined,
      mileage: body.mileage == null ? undefined : Number(body.mileage),
      comment: typeof body.comment === "string" ? body.comment : undefined,
      laborLines: Array.isArray(body.laborLines) ? (body.laborLines as CreateQuoteInput["laborLines"]) : [],
      partLines: Array.isArray(body.partLines) ? (body.partLines as CreateQuoteInput["partLines"]) : [],
      motorLines: Array.isArray(body.motorLines) ? (body.motorLines as CreateQuoteInput["motorLines"]) : [],
      pricing: {
        laborTotal: Number(pricing.laborTotal ?? 0),
        partsTotal: Number(pricing.partsTotal ?? 0),
        motorsTotal: Number(pricing.motorsTotal ?? 0),
        discount: Number(pricing.discount ?? 0),
        grandTotal: Number(pricing.grandTotal ?? 0),
      },
      createdByUserId: access.uid,
      status: "draft",
    } satisfies CreateQuoteInput);

    const jobId = await enqueueDocumentJob({
      companyId: access.companyId,
      aggregateType: "quote",
      aggregateId: quote.id,
      slugs: ["commercial-proposal"],
    });

    void fetch(`${request.nextUrl.origin}/api/documents/process-queue`, {
      method: "POST",
      headers: {
        Authorization: request.headers.get("authorization") ?? "",
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ jobId }),
    }).catch(() => undefined);

    return NextResponse.json({ quote, jobId });
  } catch (error) {
    if (error instanceof DocumentAccessError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    console.error("[quotes/create]", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to create quote" },
      { status: 500 },
    );
  }
}
