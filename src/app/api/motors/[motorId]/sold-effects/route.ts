import { NextRequest, NextResponse } from "next/server";

import { processStandaloneMotorSold } from "@/infrastructure/firestore/admin/motor-sold-effects-admin";
import { kickDocumentQueueWorker } from "@/lib/documents/engine/kick-document-queue";
import {
  DocumentAccessError,
  verifyDocumentAccess,
} from "@/lib/documents/verify-document-access";
import { mapServerError } from "@/lib/errors/map-server-error";

export const runtime = "nodejs";

type RouteContext = {
  params: Promise<{ motorId: string }>;
};

export async function POST(request: NextRequest, context: RouteContext) {
  try {
    const access = await verifyDocumentAccess(request);
    const { motorId } = await context.params;
    const body = (await request.json()) as Record<string, unknown>;

    const result = await processStandaloneMotorSold({
      companyId: access.companyId,
      actorUserId: access.uid,
      motor: {
        id: motorId.trim(),
        serialCode: String(body.serialCode ?? motorId),
        engineCode: typeof body.engineCode === "string" ? body.engineCode : undefined,
        brandName: typeof body.brandName === "string" ? body.brandName : undefined,
        configuration: typeof body.configuration === "string" ? body.configuration : "",
        localId: body.localId == null ? undefined : Number(body.localId),
      },
      amount: Number(body.amount ?? 0),
      account: String(body.account ?? "cashbox"),
      paymentMethod: String(body.paymentMethod ?? "cash"),
      comment: typeof body.comment === "string" ? body.comment : undefined,
      clientId: typeof body.clientId === "string" ? body.clientId : undefined,
      clientName: typeof body.clientName === "string" ? body.clientName : undefined,
      clientPhone: typeof body.clientPhone === "string" ? body.clientPhone : undefined,
      warrantyOverride:
        body.warrantyOverride && typeof body.warrantyOverride === "object"
          ? {
              warrantyLabel:
                typeof (body.warrantyOverride as { warrantyLabel?: unknown }).warrantyLabel === "string"
                  ? (body.warrantyOverride as { warrantyLabel: string }).warrantyLabel
                  : undefined,
              warrantyText:
                typeof (body.warrantyOverride as { warrantyText?: unknown }).warrantyText === "string"
                  ? (body.warrantyOverride as { warrantyText: string }).warrantyText
                  : undefined,
              customWarrantyDays:
                typeof (body.warrantyOverride as { customWarrantyDays?: unknown }).customWarrantyDays ===
                "number"
                  ? (body.warrantyOverride as { customWarrantyDays: number }).customWarrantyDays
                  : typeof (body.warrantyOverride as { customWarrantyMonths?: unknown }).customWarrantyMonths ===
                      "number"
                    ? (body.warrantyOverride as { customWarrantyMonths: number }).customWarrantyMonths * 30
                    : undefined,
              customWarrantyKm:
                typeof (body.warrantyOverride as { customWarrantyKm?: unknown }).customWarrantyKm === "number"
                  ? (body.warrantyOverride as { customWarrantyKm: number }).customWarrantyKm
                  : undefined,
            }
          : undefined,
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
    console.error("[motors/sold-effects]", error);
    return NextResponse.json(
      { error: mapServerError(error, "Could not record the engine sale") },
      { status: 500 },
    );
  }
}
